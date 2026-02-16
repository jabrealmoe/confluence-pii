import { run } from './index';
import { piiDetectionService } from "./services/pii-service";
import { pageService } from "./services/page-service";
import { configService } from "./services/config-service";
import { notificationService } from "./services/notification-service";
import { classificationService } from "./services/classification-service";
import { storage } from "@forge/api";

jest.mock("./services/pii-service");
jest.mock("./services/page-service");
jest.mock("./services/config-service");
jest.mock("./services/notification-service");
jest.mock("./services/classification-service");
jest.mock("@forge/api", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

describe('Main Trigger Entry Point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pageService.getPageProperty.mockResolvedValue(null);
  });

  it('should skip if no pageId in event', async () => {
    await run({});
    expect(configService.getSettings).not.toHaveBeenCalled();
  });

  it('should skip if version has already been scanned', async () => {
    const event = { content: { id: 'page-123', version: { number: 2 } } };
    pageService.getPageProperty.mockResolvedValue(2);
    
    await run(event);
    
    expect(piiDetectionService.scanPage).not.toHaveBeenCalled();
  });

  it('should scan page and take actions if PII detected', async () => {
    const event = { content: { id: 'page-123' }, atlassianId: 'user-456' };
    storage.get.mockResolvedValue(null); // No debounce
    configService.getSettings.mockResolvedValue({ enableQuarantine: true });
    
    const mockFindings = { 
        detected: true, 
        hits: [{ type: 'email', count: 1 }],
        pageData: { body: { storage: { value: '<p>test</p>' } } }
    };
    piiDetectionService.scanPage.mockResolvedValue(mockFindings);
    classificationService.detectClassification.mockResolvedValue({ id: 'internal', name: 'Internal' });
    classificationService.getClassificationLabel.mockReturnValue('classification-internal');

    await run(event);

    expect(piiDetectionService.scanPage).toHaveBeenCalledWith('page-123', expect.any(Object));
    expect(pageService.addLabels).toHaveBeenCalled();
    expect(notificationService.addColoredBanner).toHaveBeenCalled();
    expect(pageService.setRestrictions).toHaveBeenCalledWith('page-123', 'user-456');
  });

  it('should scan historical versions if enabled', async () => {
    const event = { content: { id: 'page-123' } };
    storage.get.mockResolvedValue(null);
    configService.getSettings.mockResolvedValue({ enableHistoricalScan: true });
    
    piiDetectionService.scanPage.mockResolvedValue({ 
        detected: true, 
        hits: [], 
        pageData: { body: { storage: { value: '' } } } 
    });
    classificationService.detectClassification.mockResolvedValue(null);

    await run(event);

    expect(piiDetectionService.scanHistoricalVersions).toHaveBeenCalledWith('page-123', 10);
  });
});
