import { Router } from 'express';
import { getDbPool, getRedisClient, requireAuth, rateLimit } from '@fs/shared';
import { SearchController } from '../controllers/search.controller';
import { SearchService } from '../services/search.service';
import { SearchRepository } from '../repositories/search.repository';

const router = Router();

const db = getDbPool();
const redis = getRedisClient();

const searchRepo = new SearchRepository(db);
const searchService = new SearchService(searchRepo, redis);
const searchController = new SearchController(searchService);

const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// GET /search (FTS query + filters)
router.get('/', requireAuth, searchRateLimit, searchController.search);

// GET /search/suggestions (Typeahead)
router.get('/suggestions', requireAuth, searchRateLimit, searchController.getSuggestions);

export default router;
