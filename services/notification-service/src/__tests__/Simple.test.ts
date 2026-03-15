import { describe, it, expect, vi } from 'vitest';

describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('should mock correctly', () => {
    const mockFn = vi.fn().mockReturnValue('mocked');
    expect(mockFn()).toBe('mocked');
  });
});
