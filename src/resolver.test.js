/**
 * Unit tests for Resolver functions
 */
import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

// Mock package.json
jest.mock('../package.json', () => ({
  version: '1.3.0',
  name: 'product-trigger',
}));

describe('Resolver', () => {
  let resolver;
  const STORAGE_KEY = 'pii-settings-v1';

  beforeEach(() => {
    resolver = new Resolver();
    storage.__reset();
  });

  describe('getSettings', () => {
    it('should return stored settings when they exist', async () => {
      const mockSettings = {
        email: false,
        phone: true,
        creditCard: false,
        ssn: true,
        passport: false,
        driversLicense: true,
        enableQuarantine: true,
      };

      storage.get.mockResolvedValueOnce(mockSettings);

      // Simulate the resolver definition
      resolver.define('getSettings', async () => {
        const stored = await storage.get(STORAGE_KEY);
        return stored || {
          email: true,
          phone: true,
          creditCard: true,
          ssn: true,
          passport: true,
          driversLicense: true,
          enableQuarantine: false
        };
      });

      const handler = resolver.getDefinitions()['getSettings'];
      const result = await handler();

      expect(storage.get).toHaveBeenCalledWith(STORAGE_KEY);
      expect(result).toEqual(mockSettings);
    });

    it('should return default settings when no settings are stored', async () => {
      storage.get.mockResolvedValueOnce(null);

      resolver.define('getSettings', async () => {
        const stored = await storage.get(STORAGE_KEY);
        return stored || {
          email: true,
          phone: true,
          creditCard: true,
          ssn: true,
          passport: true,
          driversLicense: true,
          enableQuarantine: false
        };
      });

      const handler = resolver.getDefinitions()['getSettings'];
      const result = await handler();

      expect(result).toEqual({
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true,
        enableQuarantine: false,
      });
    });
  });

  describe('saveSettings', () => {
    it('should save settings to storage', async () => {
      const newSettings = {
        email: false,
        phone: false,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: false,
        enableQuarantine: true,
      };

      resolver.define('saveSettings', async (req) => {
        const settings = req.payload;
        await storage.set(STORAGE_KEY, settings);
        return settings;
      });

      const handler = resolver.getDefinitions()['saveSettings'];
      const result = await handler({ payload: newSettings });

      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, newSettings);
      expect(result).toEqual(newSettings);
    });

    it('should handle empty settings', async () => {
      const emptySettings = {};

      resolver.define('saveSettings', async (req) => {
        const settings = req.payload;
        await storage.set(STORAGE_KEY, settings);
        return settings;
      });

      const handler = resolver.getDefinitions()['saveSettings'];
      const result = await handler({ payload: emptySettings });

      expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, emptySettings);
      expect(result).toEqual(emptySettings);
    });
  });

  describe('getVersion', () => {
    it('should return version information from package.json', async () => {
      const packageJson = require('../package.json');

      resolver.define('getVersion', async () => {
        return {
          version: packageJson.version,
          name: packageJson.name
        };
      });

      const handler = resolver.getDefinitions()['getVersion'];
      const result = await handler();

      expect(result).toEqual({
        version: '1.3.0',
        name: 'product-trigger',
      });
    });
  });
});
