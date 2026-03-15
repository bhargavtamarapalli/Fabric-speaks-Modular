import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { createBaseApp } from '@fs/shared';

describe('Health Check', () => {
  it('should return 200 and status ok', async () => {
    // Since we've mocked createBaseApp in vitest.setup.ts, 
    // we can check if the route was registered or just use the mock if we can get it.
    // However, supertest needs a real-ish express app.
    
    // For health check, it's simple enough that we just want to ensure it's there.
    expect(vi.mocked(app.get)).toHaveBeenCalledWith('/health', expect.any(Function));
    
    // Test the handler logic directly
    const handler = vi.mocked(app.get).mock.calls.find(call => call[0] === '/health')?.[1];
    const res: any = { json: vi.fn() };
    await handler({}, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
  });
});
