import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { SearchQuerySchema, SuggestionQuerySchema } from '../schemas/search.schemas';
import { catchAsync } from '@fs/shared';

export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    search = catchAsync(async (req: Request, res: Response) => {
        const dto = SearchQuerySchema.parse(req.query);
        const userId = req.user?.userId;
        const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);

        const result = await this.searchService.search(dto, userId, sessionId);
        res.json({ success: true, data: result });
    });

    getSuggestions = catchAsync(async (req: Request, res: Response) => {
        const { q } = SuggestionQuerySchema.parse(req.query);
        const result = await this.searchService.getSuggestions(q);
        res.json({ success: true, data: result });
    });
}
