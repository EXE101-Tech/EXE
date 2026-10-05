import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { socialApi } from '@/api/social';
import type { SocialPostInput } from '@/schemas/social';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from './keys';

export const SOCIAL_PAGE_SIZE = 20;

/** The community feed, loaded page by page (offset based, like the web client). */
export function useSocialFeedQuery(search = '') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const term = search.trim().length >= 2 ? search.trim() : '';
  return useInfiniteQuery({
    queryKey: [...queryKeys.social.feed(), term],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      socialApi.getFeed({ limit: SOCIAL_PAGE_SIZE, offset: pageParam, ...(term ? { search: term } : {}) }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === SOCIAL_PAGE_SIZE ? allPages.reduce((total, page) => total + page.length, 0) : undefined,
    enabled: isAuthenticated,
  });
}

export function useMySocialPostsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.social.mine(),
    queryFn: () => socialApi.getMine({ limit: 100 }),
    enabled: isAuthenticated,
  });
}

function useInvalidatePosts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() });
    queryClient.invalidateQueries({ queryKey: queryKeys.social.mine() });
  };
}

export function useCreateSocialPostMutation() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (data: SocialPostInput) => socialApi.create(data),
    onSuccess: invalidate,
  });
}

export function useUpdateSocialPostMutation() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SocialPostInput }) => socialApi.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSocialPostMutation() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (id: number) => socialApi.remove(id),
    onSuccess: invalidate,
  });
}

/** Likes are toggled locally by the card (it keeps its own optimistic count), so no list invalidation here. */
export function useToggleLikeMutation() {
  return useMutation({
    mutationFn: ({ id, liked }: { id: number; liked: boolean }) => (liked ? socialApi.unlike(id) : socialApi.like(id)),
  });
}

/** Comments refresh every few seconds while the comment sheet is open, so other people replies show up. */
export function useSocialCommentsQuery(postId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.social.comments(postId),
    queryFn: () => socialApi.getComments(postId),
    enabled,
    refetchInterval: enabled ? 4_000 : false,
  });
}

export function useSocialCommentMutations(postId: number) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.social.comments(postId) });

  return {
    add: useMutation({
      mutationFn: ({ content, parentId }: { content: string; parentId?: number | null }) =>
        socialApi.addComment(postId, content, parentId ?? null),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
        socialApi.updateComment(postId, commentId, content),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (commentId: number) => socialApi.removeComment(postId, commentId),
      onSuccess: refresh,
    }),
    react: useMutation({
      mutationFn: ({ commentId, reaction, clear }: { commentId: number; reaction: string; clear: boolean }) =>
        clear ? socialApi.removeCommentReaction(postId, commentId) : socialApi.setCommentReaction(postId, commentId, reaction),
      onSuccess: refresh,
    }),
  };
}
