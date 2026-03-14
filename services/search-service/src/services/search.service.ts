import { SearchRepository, SearchProductItem } from '../repositories/search.repository';
import { SearchQueryDto } from '../schemas/search.schemas';
import { Redis } from 'ioredis';
import { logger } from '@fs/shared';

export interface SearchResponse {
    results: SearchProductItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface SuggestionResponse {
    results: Array<{ id: string, slug: string, name: string, thumbnail: string }>;
}

export class SearchService {
    constructor(
        private searchRepo: SearchRepository,
        private redis: Redis
    ) {}

    async search(dto: SearchQueryDto, userId?: string, sessionId?: string): Promise<SearchResponse> {
        // 1. Fetch from DB (FTS + Filters)
        const result = await this.searchRepo.searchProducts(dto);

        // 2. Fire and forget logging
        if (dto.q) {
            this.searchRepo.logSearchQuery(dto.q, dto, userId, sessionId, result.total).catch(err => {
                logger.error({ err, msg: 'Failed to log search query' });
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

    async getSuggestions(q: string): Promise<SuggestionResponse> {
        const cacheKey = `search:suggest:${q.toLowerCase().trim()}`;
        
        // 1. Check Redis
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) {
             logger.warn({ err, msg: 'Redis error in getSuggestions, falling back to DB' });
        }

        // 2. Fallback DB
        const results = await this.searchRepo.getSuggestions(q);
        
        // 3. Cache and return (short TTL for real-time relevance)
        try {
             await this.redis.setex(cacheKey, 300, JSON.stringify({ results }));
        } catch (err) {
             logger.error({ err, msg: 'Failed to cache suggestions in Redis' });
        }
        
        return { results };
    }
}
