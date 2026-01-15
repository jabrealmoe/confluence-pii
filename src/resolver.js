import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();
const STORAGE_KEY = 'pii-settings-v1';

resolver.define('getSettings', async () => {
    const stored = await storage.get(STORAGE_KEY);
    return stored || {
        email: true,
        phone: true,
        creditCard: true,
        ssn: true,
        passport: true,
        driversLicense: true
    };
});

resolver.define('saveSettings', async (req) => {
    const settings = req.payload;
    await storage.set(STORAGE_KEY, settings);
    return settings;
});

export const handler = resolver.getDefinitions();
