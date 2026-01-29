import Resolver from '@forge/resolver';
import { configService } from './services/config-service';

const resolver = new Resolver();

// Import version from package.json
const packageJson = require('../package.json');

resolver.define('getSettings', async () => {
    return await configService.getSettings();
});

resolver.define('saveSettings', async (req) => {
    const settings = req.payload;
    return await configService.saveSettings(settings);
});

resolver.define('getVersion', async () => {
    return {
        version: packageJson.version,
        name: packageJson.name
    };
});

export const handler = resolver.getDefinitions();
