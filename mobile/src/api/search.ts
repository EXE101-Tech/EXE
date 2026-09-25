import apiClient from './client';
import { searchResultSchema } from '@/schemas/common';

export const searchApi = {
  search: async (q: string) =>
    searchResultSchema.array().parse(await apiClient.get('/search', { params: { q } })),
};
