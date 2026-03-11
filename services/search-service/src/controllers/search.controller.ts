import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { SearchQuerySchema, SuggestionQuerySchema } from '../schemas/search.schemas';

export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    search = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const dto = SearchQuerySchema.parse(req.query);
            const userId = req.user?.userId;
            const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

            const result = await this.searchService.search(dto, userId, sessionId);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { q } = SuggestionQuerySchema.parse(req.query);
            const result = await this.searchService.getSuggestions(q);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };
}
