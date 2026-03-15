import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simplest possible mocks
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
  Queue: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
}));

vi.mock('@fs/shared', () => ({
  getRedisClient: vi.fn().mockReturnValue({ on: vi.fn() }),
  getDbPool: vi.fn().mockReturnValue({ query: vi.fn(), on: vi.fn() }),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  createBaseApp: vi.fn().mockReturnValue({ use: vi.fn(), listen: vi.fn(), get: vi.fn() }),
  globalErrorHandler: vi.fn(),
  BaseRepository: class { constructor() {} query = vi.fn(); mapToCamelCase = vi.fn(x => x); },
  AppError: class extends Error { constructor(m: string) { super(m); } },
}));

import { EventConsumer } from '../workers/EventConsumer';

describe('EventConsumer', () => {
  it('should initialize without crashing', () => {
    const consumer = new EventConsumer();
    expect(consumer).toBeDefined();
  });
});
