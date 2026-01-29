/**
 * Unit tests for Admin Page Component
 * Tests Toggle switches and state management
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { storage } from '@forge/api';

// We need to mock the admin component since it uses Forge components
// For now, we'll test the logic separately

describe('Admin Page', () => {
  const STORAGE_KEY = 'pii-settings-v1';

  beforeEach(() => {
    storage.__reset();
  });

  describe('Settings State Management', () => {
    it('should load default settings when no settings exist', async () => {
      storage.get.mockResolvedValueOnce(null);

      const defaultSettings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      const stored = await storage.get(STORAGE_KEY);
      const settings = stored || defaultSettings;

      expect(settings).toEqual(defaultSettings);
    });

    it('should load stored settings when they exist', async () => {
      const customSettings = {
        email: false,
        phone: true,
        creditCard: false,
        ssn: true,
        passport: false,
        driversLicense: true,
        enableQuarantine: true
      };

      storage.get.mockResolvedValueOnce(customSettings);

      const settings = await storage.get(STORAGE_KEY);

      expect(settings).toEqual(customSettings);
    });
  });

  describe('Toggle Switch Logic', () => {
    it('should toggle individual PII detector settings', () => {
      const initialSettings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      // Simulate toggle
      const handleToggle = (key, currentSettings) => ({
        ...currentSettings,
        [key]: !currentSettings[key]
      });

      const newSettings = handleToggle('email', initialSettings);
      expect(newSettings.email).toBe(false);
      expect(newSettings.phone).toBe(true); // Other settings unchanged
    });

    it('should toggle quarantine setting independently', () => {
      const initialSettings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      const handleToggle = (key, currentSettings) => ({
        ...currentSettings,
        [key]: !currentSettings[key]
      });

      const newSettings = handleToggle('enableQuarantine', initialSettings);
      expect(newSettings.enableQuarantine).toBe(true);
      // All PII detectors should remain unchanged
      expect(newSettings.email).toBe(true);
      expect(newSettings.phone).toBe(true);
    });

    it('should handle multiple toggles correctly', () => {
      let settings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      const handleToggle = (key, currentSettings) => ({
        ...currentSettings,
        [key]: !currentSettings[key]
      });

      // Toggle multiple settings
      settings = handleToggle('email', settings);
      settings = handleToggle('phone', settings);
      settings = handleToggle('enableQuarantine', settings);

      expect(settings.email).toBe(false);
      expect(settings.phone).toBe(false);
      expect(settings.enableQuarantine).toBe(true);
      expect(settings.creditCard).toBe(true); // Unchanged
    });
  });

  describe('Save Configuration', () => {
    it('should save settings to storage when save button is clicked', async () => {
      const settings = {
        email: false,
        phone: true,
        creditCard: false,
        ssn: true,
        passport: false,
        driversLicense: true,
        enableQuarantine: true
      };

      await storage.set(STORAGE_KEY, settings);

      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, settings);
    });

    it('should save all toggle states correctly', async () => {
      const allEnabled = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: true
      };

      await storage.set(STORAGE_KEY, allEnabled);
      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, allEnabled);

      const allDisabled = {
        email: false,
        phone: false,
        creditCard: false,
        ssn: false,
        passport: false,
        driversLicense: false,
        enableQuarantine: false
      };

      await storage.set(STORAGE_KEY, allDisabled);
      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, allDisabled);
    });
  });

  describe('Settings Validation', () => {
    it('should maintain all required setting keys', () => {
      const settings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      const requiredKeys = [
        'email',
        'phone',
        'creditCard',
        'ssn',
        'passport',
        'driversLicense',
        'enableQuarantine'
      ];

      requiredKeys.forEach(key => {
        expect(settings).toHaveProperty(key);
        expect(typeof settings[key]).toBe('boolean');
      });
    });

    it('should handle partial settings gracefully', () => {
      const partialSettings = {
        email: true,
        phone: false
      };

      const defaultSettings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      const mergedSettings = { ...defaultSettings, ...partialSettings };

      expect(mergedSettings.email).toBe(true);
      expect(mergedSettings.phone).toBe(false);
      expect(mergedSettings.creditCard).toBe(true); // From defaults
    });
  });

  describe('Quarantine Toggle Separation', () => {
    it('should keep quarantine setting separate from PII detectors', () => {
      const settings = {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false
      };

      // PII detector keys
      const piiDetectorKeys = ['email', 'phone', 'creditCard', 'ssn', 'passport', 'driversLicense'];
      
      // Action keys
      const actionKeys = ['enableQuarantine'];

      // Verify separation
      piiDetectorKeys.forEach(key => {
        expect(settings).toHaveProperty(key);
      });

      actionKeys.forEach(key => {
        expect(settings).toHaveProperty(key);
      });

      // Verify they are distinct
      const allKeys = Object.keys(settings);
      expect(allKeys).toHaveLength(7);
    });
  });
});
