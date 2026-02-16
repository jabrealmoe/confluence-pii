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
    const accountId = req.context?.accountId;
    return await configService.saveSettings(settings, accountId);
});

import { siteScanService } from './services/scan-site-service';

resolver.define('getSiteStats', async () => {
    return {
        totalPages: await siteScanService.getPageCount()
    };
});

resolver.define('scanSiteBatch', async (req) => {
    const { start, limit } = req.payload;
    return await siteScanService.scanBatch(start, limit);
});

resolver.define('getVersion', async () => {
    return {
        version: packageJson.version,
        name: packageJson.name
    };
});

export const handler = resolver.getDefinitions();
