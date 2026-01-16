// Jest setup file

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console.error and console.warn to reduce noise in tests
// Uncomment if needed:
// global.console.error = jest.fn();
// global.console.warn = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
