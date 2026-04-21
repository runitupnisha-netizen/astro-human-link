import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom doesn't implement these — needed by framer-motion
if (!window.IntersectionObserver) {
  // @ts-expect-error - test stub
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
if (!window.ResizeObserver) {
  // @ts-expect-error - test stub
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}