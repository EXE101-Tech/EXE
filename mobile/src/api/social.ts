import apiClient from './client';
import {
  commentReactionResultSchema,
  socialCommentSchema,
  socialLikeSchema,
  socialPostSchema,
  type SocialPostInput,
} from '@/schemas/social';

export interface SocialFeedParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export const socialApi = {
  getFeed: async (params: SocialFeedParams = {}) =>
    socialPostSchema.array().parse(await apiClient.get('/social/posts', { params })),
  getMine: async (params: SocialFeedParams = {}) =>
    socialPostSchema.array().parse(await apiClient.get('/social/posts/mine', { params })),
  create: async (data: SocialPostInput) => socialPostSchema.parse(await apiClient.post('/social/posts', data)),
  update: async (id: number, data: SocialPostInput) =>
    socialPostSchema.parse(await apiClient.put(`/social/posts/${id}`, data)),
  remove: async (id: number) => apiClient.delete(`/social/posts/${id}`),
  like: async (id: number) => socialLikeSchema.parse(await apiClient.put(`/social/posts/${id}/like`)),
  unlike: async (id: number) => socialLikeSchema.parse(await apiClient.delete(`/social/posts/${id}/like`)),
  getComments: async (id: number) =>
    socialCommentSchema.array().parse(await apiClient.get(`/social/posts/${id}/comments`)),
  addComment: async (id: number, content: string, parentId: number | null = null) =>
    socialCommentSchema.parse(await apiClient.post(`/social/posts/${id}/comments`, { content, parent_id: parentId })),
  updateComment: async (postId: number, commentId: number, content: string) =>
    socialCommentSchema.parse(await apiClient.put(`/social/posts/${postId}/comments/${commentId}`, { content })),
  removeComment: async (postId: number, commentId: number) =>
    apiClient.delete(`/social/posts/${postId}/comments/${commentId}`),
  setCommentReaction: async (postId: number, commentId: number, reaction: string) =>
    commentReactionResultSchema.parse(
      await apiClient.put(`/social/posts/${postId}/comments/${commentId}/reaction`, { reaction }),
    ),
  removeCommentReaction: async (postId: number, commentId: number) =>
    commentReactionResultSchema.parse(await apiClient.delete(`/social/posts/${postId}/comments/${commentId}/reaction`)),
};
