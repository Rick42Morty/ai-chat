"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateChatResponse, ListChatsResponse } from "@/types/api";
import type { Chat } from "@/types/db";

export function useChatList() {
  return useInfiniteQuery({
    queryKey: ["chats"],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam ? `?cursor=${pageParam}` : "";
      return apiClient.get<ListChatsResponse>(`/api/chats${cursor}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    select: (data) => ({
      chats: data.pages.flatMap((p) => p.chats),
      hasNextPage: !!data.pages[data.pages.length - 1].nextCursor,
    }),
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) =>
      apiClient.post<CreateChatResponse>("/api/chats", { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => apiClient.delete(`/api/chats/${chatId}`),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      queryClient.removeQueries({ queryKey: ["chat-messages", chatId] });
      const prev = queryClient.getQueryData(["chats"]);
      queryClient.setQueryData<{ pages: { chats: Chat[] }[] }>(
        ["chats"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              chats: page.chats.filter((c) => c.id !== chatId),
            })),
          };
        },
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["chats"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useRenameChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      apiClient.patch(`/api/chats/${chatId}`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
