import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import { SearchService } from '../../src/services/search.service';
import { SearchRepository } from '../../src/repositories/search.repository';
import { Redis } from 'ioredis';

describe('SearchService - FTS Queries and Typeahead', () => {
    let service: SearchService;
    let mockRepo: {
        searchProducts: MockInstance;
        getSuggestions: MockInstance;
        logSearchQuery: MockInstance;
    };
    let mockRedis: {
        get: MockInstance;
        setex: MockInstance;
    };

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

    it('should query the repository for FTS and log the query asynchronously', async () => {
        const mockResults = {
            data: [{ id: 'p1', name: 'Cotton Shirt' }],
            total: 1
        };
        mockRepo.searchProducts.mockResolvedValue(mockResults);

        const dto = { q: 'cotton', limit: 20, sort: 'relevance' as const, page: 1 };
        const response = await service.search(dto, 'user_1');

        expect(mockRepo.searchProducts).toHaveBeenCalledWith(dto);
        expect(response.results).toEqual(mockResults.data);
        expect(response.pagination.total).toBe(1);
        
        // Ensure async logging was called
        expect(mockRepo.logSearchQuery).toHaveBeenCalledWith('cotton', dto, 'user_1', undefined, 1);
    });

    it('should return cached typeahead suggestions if available', async () => {
        const cachedResults = { results: [{ name: 'Silk Saree' }] };
        mockRedis.get.mockResolvedValue(JSON.stringify(cachedResults));

        const response = await service.getSuggestions('silk');

        expect(mockRedis.get).toHaveBeenCalledWith('search:suggest:silk');
        expect(mockRepo.getSuggestions).not.toHaveBeenCalled();
        expect(response.results[0]!.name).toBe('Silk Saree');
    });

    it('should query DB and cache typeahead suggestions if not in Redis', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRepo.getSuggestions.mockResolvedValue([{ name: 'Linen Kurta' }]);

        const response = await service.getSuggestions('linen');

        expect(mockRepo.getSuggestions).toHaveBeenCalledWith('linen');
        expect(mockRedis.setex).toHaveBeenCalledWith('search:suggest:linen', 300, JSON.stringify({ results: [{ name: 'Linen Kurta' }] }));
        expect(response.results[0]!.name).toBe('Linen Kurta');
    });
});
