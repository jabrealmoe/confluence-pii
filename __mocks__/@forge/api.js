// Mock for @forge/api
const mockStorage = new Map();

const storage = {
  get: jest.fn((key) => Promise.resolve(mockStorage.get(key))),
  set: jest.fn((key, value) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  delete: jest.fn((key) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockStorage.clear();
    return Promise.resolve();
  }),
  // Helper for tests
  __reset: () => {
    mockStorage.clear();
    storage.get.mockClear();
    storage.set.mockClear();
    storage.delete.mockClear();
    storage.clear.mockClear();
  },
};

const api = {
  asApp: jest.fn(() => ({
    requestConfluence: jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })),
  })),
};

const route = jest.fn((strings, ...values) => {
  return strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '');
  }, '');
});

module.exports = {
  storage,
  api,
  route,
  default: api,
};
