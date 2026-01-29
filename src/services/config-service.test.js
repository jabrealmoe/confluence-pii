import { configService } from './config-service';
import { storage } from '@forge/api';

// Mock @forge/api
jest.mock('@forge/api', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

describe('ConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configService.invalidateCache();
  });

  it('should fetch settings from storage if cache is empty', async () => {
    const mockSettings = { email: true };
    storage.get.mockResolvedValue(mockSettings);

    const settings = await configService.getSettings();
    
    expect(storage.get).toHaveBeenCalledWith('pii-settings-v1');
    expect(settings).toEqual(mockSettings);
  });

  it('should return default settings if storage is empty', async () => {
    storage.get.mockResolvedValue(null);

    const settings = await configService.getSettings();
    
    expect(settings.email).toBe(true);
    expect(settings.enableQuarantine).toBe(false);
  });

  it('should use cache on subsequent calls', async () => {
    storage.get.mockResolvedValue({ cached: true });

    await configService.getSettings();
    const settings = await configService.getSettings();
    
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(settings.cached).toBe(true);
  });

  it('should update cache when saving settings', async () => {
    const newSettings = { email: false };
    await configService.saveSettings(newSettings);
    
    expect(storage.set).toHaveBeenCalledWith('pii-settings-v1', newSettings);
    
    const settings = await configService.getSettings();
    expect(settings.email).toBe(false);
    expect(storage.get).not.toHaveBeenCalled(); // Should be using cache
  });
});
