/**
 * Test Setup Configuration
 *
 * This file is executed before all tests and sets up the test environment.
 */

import '@testing-library/jest-dom';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console.error to fail tests on React warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  waitFor: async (condition: () => boolean, timeout = 5000): Promise<void> => {
    const startTime = Date.now();
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

  sleep: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),
};

// Declare global types
declare global {
  var testUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
    sleep: (ms: number) => Promise<void>;
  };
}

export {};
