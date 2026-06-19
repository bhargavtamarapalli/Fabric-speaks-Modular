import { describe, it, expect } from 'vitest';
import { calculateHealthStatus } from '../utils/health.util';

describe('InventoryService - Stock Health Rules', () => {
  it('returns CRITICAL when stock is 0', () => {
    expect(calculateHealthStatus(0)).toBe('CRITICAL');
  });

  it('returns CRITICAL when stock is negative', () => {
    expect(calculateHealthStatus(-5)).toBe('CRITICAL');
  });

  it('returns WARNING when stock is between 1 and 4', () => {
    expect(calculateHealthStatus(1)).toBe('WARNING');
    expect(calculateHealthStatus(4)).toBe('WARNING');
  });

  it('returns HEALTHY when stock is 5 or more', () => {
    expect(calculateHealthStatus(5)).toBe('HEALTHY');
    expect(calculateHealthStatus(10)).toBe('HEALTHY');
    expect(calculateHealthStatus(100)).toBe('HEALTHY');
  });

  it('handles float numbers appropriately for boundaries', () => {
    // Edge case if physical items somehow get decimal points (not expected, but boundary test)
    expect(calculateHealthStatus(4.9)).toBe('WARNING');
    expect(calculateHealthStatus(5.0)).toBe('HEALTHY');
  });
});
