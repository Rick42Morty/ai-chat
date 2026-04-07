"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ROWS = [
  {
    id: "a1",
    side: "assistant" as const,
    bubble: "h-14 w-[17rem] max-w-full",
  },
  {
    id: "u1",
    side: "user" as const,
    bubble: "h-11 w-[11rem] max-w-full",
  },
  {
    id: "a2",
    side: "assistant" as const,
    bubble: "h-[4.5rem] w-[20rem] max-w-full",
  },
  {
    id: "u2",
    side: "user" as const,
    bubble: "h-12 w-[13rem] max-w-full",
  },
  {
    id: "a3",
    side: "assistant" as const,
    bubble: "h-16 w-[15rem] max-w-full",
  },
] as const;

export function ChatLoadingSkeleton() {
  const reduce = useReducedMotion();

  return (
    <div
      className="flex flex-1 flex-col min-h-0 items-center justify-center px-4 py-10"
      role="status"
      aria-busy
      aria-label="Loading conversation"
    >
      <motion.div
        className="w-full max-w-3xl space-y-6"
        initial={reduce ? "show" : "hidden"}
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: reduce ? 0 : 0.07,
              delayChildren: 0.05,
            },
          },
        }}
      >
        {ROWS.map((row) => {
          const isUser = row.side === "user";
          return (
            <motion.div
              key={row.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: easeOut },
              }}
              className={cn(
                "flex items-start gap-3",
                isUser && "flex-row-reverse",
              )}
            >
              <div className="skeleton-avatar h-8 w-8 shrink-0 rounded-full" />
              <div
                className={cn(
                  "flex min-w-0 max-w-[80%] flex-col",
                  isUser && "items-end",
                )}
              >
                <div
                  className={cn(
                    "skeleton-line rounded-2xl",
                    row.bubble,
                    isUser && "!bg-primary/25",
                  )}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
