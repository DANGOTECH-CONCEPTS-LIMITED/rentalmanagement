import "@testing-library/jest-dom";

// Mock window.matchMedia which is not available in Jest's DOM environment
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock environment variables
global.process.env.VITE_API_BASE_URL = "http://3.216.182.63:8091";
