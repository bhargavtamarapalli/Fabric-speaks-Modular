import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { SearchService } from '../services/search.service';
import { SearchRepository } from '../repositories/search.repository';
import { getDbPool } from '@fs/shared/db';
import { getRedisClient } from '@fs/shared/redis';

export const searchRouter = Router();

const db = getDbPool();
const redis = getRedisClient();

const searchRepo = new SearchRepository(db);
const searchService = new SearchService(searchRepo, redis);
const searchController = new SearchController(searchService);

// GET /search (FTS query + filters)
searchRouter.get('/', searchController.search);

// GET /search/suggestions (Typeahead)
searchRouter.get('/suggestions', searchController.getSuggestions);
