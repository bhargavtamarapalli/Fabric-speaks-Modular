import { vi } from 'vitest';

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Queue: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@fs/shared', () => ({
  getRedisClient: vi.fn().mockReturnValue({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }),
  getDbPool: vi.fn().mockReturnValue({
    query: vi.fn(),
    on: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  createBaseApp: vi.fn().mockReturnValue({
    use: vi.fn(),
    listen: vi.fn().mockReturnValue({ close: vi.fn() }),
    get: vi.fn(),
  }),
  globalErrorHandler: vi.fn(),
  BaseRepository: class {
    constructor(protected db: any) {}
    query = vi.fn();
    mapToCamelCase = vi.fn((x) => x);
    mapToSnakeCase = vi.fn((x) => x);
  },
  AppError: class extends Error {
    constructor(public message: string, public statusCode: number = 500) {
      super(message);
    }
  },
}));
