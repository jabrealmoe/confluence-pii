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
      enableQuarantine: false,
      enableHistoricalScan: false,
      clearanceLevels: [
        {
          id: 'top-secret',
          name: 'Top Secret',
          rank: 4,
          groups: [],
          keywords: ['TOP SECRET', 'TS', 'TS//SCI', 'TS/SCI']
        },
        {
          id: 'secret',
          name: 'Secret',
          rank: 3,
          groups: [],
          keywords: ['SECRET', 'S//']
        },
        {
          id: 'confidential',
          name: 'Confidential',
          rank: 2,
          groups: [],
          keywords: ['CONFIDENTIAL', 'C//']
        },
        {
          id: 'unclassified',
          name: 'Unclassified',
          rank: 1,
          groups: [],
          keywords: ['UNCLASSIFIED', 'U//']
        }
      ]
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
