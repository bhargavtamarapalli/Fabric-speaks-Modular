import { describe, it, expect } from 'vitest';
import { InventoryService } from '../services/inventory.service';

describe('InventoryService - Stock Health Rules', () => {
  it('returns CRITICAL when stock is 0', () => {
    expect(InventoryService.calculateHealthStatus(0)).toBe('CRITICAL');
  });

  it('returns CRITICAL when stock is negative', () => {
    expect(InventoryService.calculateHealthStatus(-5)).toBe('CRITICAL');
  });

  it('returns WARNING when stock is between 1 and 4', () => {
    expect(InventoryService.calculateHealthStatus(1)).toBe('WARNING');
    expect(InventoryService.calculateHealthStatus(4)).toBe('WARNING');
  });

  it('returns HEALTHY when stock is 5 or more', () => {
    expect(InventoryService.calculateHealthStatus(5)).toBe('HEALTHY');
    expect(InventoryService.calculateHealthStatus(10)).toBe('HEALTHY');
    expect(InventoryService.calculateHealthStatus(100)).toBe('HEALTHY');
  });

  it('handles float numbers appropriately for boundaries', () => {
    // Edge case if physical items somehow get decimal points (not expected, but boundary test)
    expect(InventoryService.calculateHealthStatus(4.9)).toBe('WARNING');
    expect(InventoryService.calculateHealthStatus(5.0)).toBe('HEALTHY');
  });
});
