import { storage } from "@forge/api";

const SETTINGS_KEY = 'pii-settings-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class ConfigService {
  constructor() {
    this.cache = null;
    this.lastFetch = 0;
  }

  async getSettings() {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (this.cache && (now - this.lastFetch < CACHE_TTL)) {
      console.log("📂 Using cached settings");
      return this.cache;
    }

    console.log("📥 Fetching settings from storage");
    const stored = await storage.get(SETTINGS_KEY);
    this.cache = stored || {
      email: true,
      phone: true,
      creditCard: true,
      ssn: true,
      passport: true,
      driversLicense: true,
      enableQuarantine: false
    };
    this.lastFetch = now;
    
    return this.cache;
  }

  async saveSettings(settings) {
    await storage.set(SETTINGS_KEY, settings);
    this.cache = settings;
    this.lastFetch = Date.now();
    return settings;
  }

  invalidateCache() {
    this.cache = null;
    this.lastFetch = 0;
  }
}

export const configService = new ConfigService();
