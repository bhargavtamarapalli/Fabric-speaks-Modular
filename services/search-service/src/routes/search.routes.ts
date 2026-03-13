import { Router } from 'express';
import { getDbPool, getRedisClient } from '@fs/shared';
import { SearchController } from '../controllers/search.controller';
import { SearchService } from '../services/search.service';
import { SearchRepository } from '../repositories/search.repository';

const router = Router();

const db = getDbPool();
const redis = getRedisClient();

const searchRepo = new SearchRepository(db);
const searchService = new SearchService(searchRepo, redis);
const searchController = new SearchController(searchService);

// GET /search (FTS query + filters)
router.get('/', searchController.search);

// GET /search/suggestions (Typeahead)
router.get('/suggestions', searchController.getSuggestions);

export default router;
