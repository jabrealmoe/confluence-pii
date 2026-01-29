import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();
const STORAGE_KEY = 'pii-settings-v1';

// Import version from package.json
const packageJson = require('../package.json');

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

resolver.define('saveSettings', async (req) => {
    const settings = req.payload;
    await storage.set(STORAGE_KEY, settings);
    return settings;
});

resolver.define('getVersion', async () => {
    return {
        version: packageJson.version,
        name: packageJson.name
    };
});

export const handler = resolver.getDefinitions();
