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

  it('should fetch settings from storage if cache is empty and merge defaults', async () => {
    const mockSettings = { email: false, customSetting: 'value' };
    storage.get.mockResolvedValue(mockSettings);

    const settings = await configService.getSettings();
    
    expect(storage.get).toHaveBeenCalledWith('pii-settings-v1');
    expect(settings.email).toBe(false); // Overridden by mock
    expect(settings.phone).toBe(true); // Default value merged
    expect(settings.customSetting).toBe('value'); // Preserved from storage
  });

  it('should return default settings if storage is empty', async () => {
    storage.get.mockResolvedValue(null);

    const settings = await configService.getSettings();
    
    expect(settings.email).toBe(true);
    expect(settings.enableQuarantine).toBe(false);
    expect(settings.clearanceLevels).toHaveLength(5);
  });

  it('should use cache on subsequent calls', async () => {
    storage.get.mockResolvedValue({ email: true });

    await configService.getSettings();
    const settings = await configService.getSettings();
    
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(settings.email).toBe(true);
  });

  it('should update cache when saving settings', async () => {
    // Mock get for audit logging
    storage.get.mockResolvedValueOnce({ email: true });

    const newSettings = { email: false };
    const result = await configService.saveSettings(newSettings);
    
    // saveSettings merges with defaults before storing, so the stored object includes all default keys
    expect(storage.set).toHaveBeenCalledWith('pii-settings-v1', expect.objectContaining({ email: false, phone: true }));
    expect(result.email).toBe(false);
    expect(result.clearanceLevels).toHaveLength(5); // defaults preserved
    
    const settings = await configService.getSettings();
    expect(settings.email).toBe(false);
    
    // storage.get was called once by saveSettings (audit log), then not again by getSettings (cache)
    expect(storage.get).toHaveBeenCalledTimes(1);
    expect(storage.get).toHaveBeenCalledWith('pii-settings-v1');
  });
});
