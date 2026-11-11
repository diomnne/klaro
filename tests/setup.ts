import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Every test runs with a fetch that refuses to go anywhere, so nothing can reach
 * /api/chat or Google by accident. A test that needs a reply stubs fetch itself
 * (see tests/helpers/chat-fetch.ts). An unmocked call fails the test in
 * afterEach: the chat catches fetch errors and shows a notice, so a rejection
 * alone could pass unnoticed.
 */
const unmockedCalls: string[] = [];

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function blockedFetch(input: RequestInfo | URL): Promise<Response> {
  const url = urlOf(input);

  unmockedCalls.push(url);

  return Promise.reject(
    new Error(`Blocked a real network call to ${url}. Mock fetch in this test.`),
  );
}

const isBrowserLike = typeof window !== 'undefined';

if (isBrowserLike) {
  // jsdom has no layout engine, so scrolling is a no-op the panel can call.
  Element.prototype.scrollIntoView = () => {};
}

beforeEach(() => {
  unmockedCalls.length = 0;
  vi.stubGlobal('fetch', blockedFetch);

  if (isBrowserLike) {
    // Browser features the chat relies on that jsdom doesn't implement.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
  }
});

afterEach(() => {
  if (isBrowserLike) {
    cleanup();
    window.localStorage.clear();
  }

  vi.useRealTimers();
  vi.unstubAllGlobals();

  if (unmockedCalls.length > 0) {
    const calls = unmockedCalls.splice(0).join(', ');

    throw new Error(`The test made real network calls: ${calls}`);
  }
});
