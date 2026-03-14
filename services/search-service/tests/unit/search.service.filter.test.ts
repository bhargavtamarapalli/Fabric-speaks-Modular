import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../../src/services/search.service';
import { SearchRepository } from '../../src/repositories/search.repository';
import { Redis } from 'ioredis';

describe('SearchService - Filtering and Pagination Edge Cases', () => {
    let service: SearchService;
    let mockRepo: any;
    let mockRedis: any;

    beforeEach(() => {
        mockRepo = {
            searchProducts: vi.fn(),
            getSuggestions: vi.fn(),
            logSearchQuery: vi.fn().mockResolvedValue(true)
        };
        mockRedis = {
            get: vi.fn(),
            setex: vi.fn()
        };

        service = new SearchService(
            mockRepo as unknown as SearchRepository,
            mockRedis as unknown as Redis
        );
    });

    it('should correctly calculate pagination pages based on total count', async () => {
        // total 50, limit 20 -> 3 pages
        mockRepo.searchProducts.mockResolvedValue({
            data: [{}, {}, {}],
            total: 50
        });

        const dto = { limit: 20, page: 1, sort: 'relevance' as const };
        const response = await service.search(dto);

        expect(response.pagination.pages).toBe(3);
        expect(response.pagination.total).toBe(50);
        expect(response.pagination.limit).toBe(20);
    });

    it('should handle zero results gracefully', async () => {
        mockRepo.searchProducts.mockResolvedValue({
            data: [],
            total: 0
        });

        const dto = { limit: 20, page: 1, sort: 'relevance' as const };
        const response = await service.search(dto);

        expect(response.results.length).toBe(0);
        expect(response.pagination.total).toBe(0);
        expect(response.pagination.pages).toBe(0); // Math.ceil(0 / 20) = 0
    });

    it('should pass all generic filters (fabric, brand, min_price) directly to repository without modification', async () => {
        mockRepo.searchProducts.mockResolvedValue({
            data: [],
            total: 0
        });

        const dto = { 
            fabric: 'Cotton', 
            brand: 'FabIndia', 
            minPrice: 1500, 
            limit: 20, 
            page: 1, 
            sort: 'relevance' as const 
        };
        await service.search(dto);

        expect(mockRepo.searchProducts).toHaveBeenCalledWith(dto);
    });
});
