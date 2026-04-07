"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getRealtimeClient } from "@/lib/supabase/realtime-client";

function chatIdFromBroadcastPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  return typeof p.chatId === "string" ? p.chatId : undefined;
}

export function useRealtimeChatSync(
  userId: string | undefined,
  anonSessionId: string | undefined,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const channelName = userId
      ? `chats:${userId}`
      : anonSessionId
        ? `anon-chats:${anonSessionId}`
        : null;
    if (!channelName) return;

    const client = getRealtimeClient();
    const channel = client.channel(channelName);

    channel
      .on("broadcast", { event: "chat_created" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      })
      .on("broadcast", { event: "chat_updated" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      })
      .on("broadcast", { event: "messages_changed" }, ({ payload }) => {
        const chatId = chatIdFromBroadcastPayload(payload);
        if (!chatId) return;
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      })
      .on("broadcast", { event: "chat_deleted" }, ({ payload }) => {
        const chatId = chatIdFromBroadcastPayload(payload);
        if (!chatId) return;
        queryClient.removeQueries({ queryKey: ["chat-messages", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        if (pathname === `/chat/${chatId}`) {
          router.replace("/chat");
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId, anonSessionId, queryClient, router, pathname]);
}
