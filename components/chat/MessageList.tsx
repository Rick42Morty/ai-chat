"use client";

import type { UIMessage } from "ai";
import { motion, useReducedMotion } from "framer-motion";
import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { easeOut } from "@/lib/motion";

interface Props {
  messages: UIMessage[];
  isStreaming: boolean;
}

function AssistantPendingRow() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl bg-muted px-4 py-3.5 text-sm">
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              style={{
                animation: `thinking 1.2s ease-in-out ${delay}ms infinite`,
              }}
            />
          ))}
        </span>
        <span className="sr-only">Assistant is replying</span>
      </div>
    </div>
  );
}

export function MessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const prevCountRef = useRef(0);

  const last = messages[messages.length - 1];
  const awaitingAssistant =
    isStreaming && (messages.length === 0 || last?.role === "user");

  useEffect(() => {
    // Count virtual rows: each message + the thinking indicator if visible.
    const count = messages.length + (awaitingAssistant ? 1 : 0);
    const grew = count > prevCountRef.current;
    prevCountRef.current = count;
    // Only scroll when a new row appears or during active streaming.
    // Skipping scroll on pure ID/content merges from DB refetches avoids
    // unexpected large jumps.
    if (!grew && !isStreaming) return;
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "instant" : "smooth",
    });
  }, [messages, isStreaming, awaitingAssistant]);

  if (messages.length === 0 && !awaitingAssistant) {
    return <div className="flex-1 min-h-0" />;
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-6">
        {messages.map((message, i) => (
          <motion.div
            key={message.id}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : easeOut}
          >
            <MessageBubble
              message={message}
              isStreaming={
                isStreaming &&
                i === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          </motion.div>
        ))}
        {awaitingAssistant && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : easeOut}
          >
            <AssistantPendingRow />
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
