import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  fabric: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  colour: z.string().optional(),
  minPrice: z.string().transform(val => parseFloat(val)).optional(),
  maxPrice: z.string().transform(val => parseFloat(val)).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'relevance']).default('relevance'),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
}).refine(data => {
  return !!(data.q || data.fabric || data.brand || data.size || data.colour || data.minPrice || data.maxPrice);
}, {
  message: "At least one search criterion or query must be provided",
  path: ["q"]
});

export const SuggestionQuerySchema = z.object({
  q: z.string().min(1, "Query is required"),
});

export type SearchQueryDto = z.infer<typeof SearchQuerySchema>;
