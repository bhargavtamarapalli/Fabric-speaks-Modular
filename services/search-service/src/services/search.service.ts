import { SearchRepository } from '../repositories/search.repository';
import { SearchQueryDto } from '../schemas/search.schemas';
import { Redis } from 'ioredis';

export class SearchService {
    constructor(
        private searchRepo: SearchRepository,
        private redis: Redis
    ) {}

    async search(dto: SearchQueryDto, userId?: string, sessionId?: string): Promise<any> {
        // 1. Fetch from DB (FTS + Filters)
        const result = await this.searchRepo.searchProducts(dto);

        // 2. Fire and forget logging
        if (dto.q) {
            this.searchRepo.logSearchQuery(dto.q, dto, userId, sessionId, result.total).catch(err => {
                console.error('Failed to log search query:', err);
            });
        }

        return {
            results: result.data,
            pagination: {
                total: result.total,
                page: dto.page,
                limit: dto.limit,
                pages: Math.ceil(result.total / (dto.limit || 20))
            }
        };
    }

    async getSuggestions(q: string): Promise<any> {
        const cacheKey = `search:suggest:${q.toLowerCase().trim()}`;
        
        // 1. Check Redis
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        // 2. Fallback DB
        const results = await this.searchRepo.getSuggestions(q);
        
        // 3. Cache and return (short TTL for real-time relevance)
        await this.redis.setex(cacheKey, 300, JSON.stringify({ results }));
        
        return { results };
    }
}
