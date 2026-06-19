/**
 * Test Setup - Phase 13: Testing & QA
 * Global test configuration and utilities
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
  }

  send(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  close() {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose();
    }
  }

  addEventListener(event, handler) {
    if (event === 'open') {
      this.onopen = handler;
    } else if (event === 'close') {
      this.onclose = handler;
    } else if (event === 'error') {
      this.onerror = handler;
    } else if (event === 'message') {
      this.onmessage = handler;
    }
  }

  removeEventListener() {}
};

// Mock API responses
export const mockAPIResponses = {
  login: {
    access: 'mock_access_token',
    refresh: 'mock_refresh_token',
  },
  ticket: {
    id: 1,
    title: 'Test Ticket',
    status: 'open',
    priority: 'medium',
    created_at: new Date().toISOString(),
  },
  user: {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'customer',
  },
};

// Test utilities
export const createMockUser = (overrides = {}) => ({
  ...mockAPIResponses.user,
  ...overrides,
});

export const createMockTicket = (overrides = {}) => ({
  ...mockAPIResponses.ticket,
  ...overrides,
});

export const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
    },
  },
};

// Test data factories
export const factories = {
  user: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    email: `user${Math.random()}@example.com`,
    first_name: 'Test',
    last_name: 'User',
    role: 'customer',
    is_active: true,
    ...overrides,
  }),

  ticket: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    title: 'Test Ticket',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    category: 'general',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  message: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    content: 'Test message',
    is_internal: false,
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  kbArticle: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    title: 'Test Article',
    content: 'Test content',
    category: 'General',
    is_published: true,
    created_at: new Date().toISOString(),
    ...overrides,
  }),
};

console.log('Test setup complete');
