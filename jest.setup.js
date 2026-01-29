// Jest setup file for global test configuration
global.console = {
  ...console,
  // Suppress console logs during tests unless there's an error
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};
