import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  value: 1024,
});

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  value: 768,
});

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  value: 1024,
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  value: 768,
});

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    bottom: 768,
    height: 768,
    left: 0,
    right: 1024,
    top: 0,
    width: 1024,
    x: 0,
    y: 0,
    toJSON: () => undefined,
  };
};
