import { z } from 'zod';

export const sportResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon_url: z.string().nullable().optional(),
});
export type SportResponse = z.infer<typeof sportResponseSchema>;

export const sportCatalogItemSchema = z.object({
  id: z.number().nullable().optional(),
  key: z.string(),
  name: z.string(),
});
export type SportCatalogItem = z.infer<typeof sportCatalogItemSchema>;

export const searchResultSchema = z.object({
  kind: z.enum(['venue', 'gameroom', 'team', 'lfg']),
  id: z.number(),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
