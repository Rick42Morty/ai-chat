"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SUGGESTED_PROMPTS } from "@/lib/chat/suggested-prompts";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  onSelect?: (prompt: string) => void;
}

export function SuggestedPromptsList({ className, onSelect }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      aria-label="Example topics"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { ...easeOut, duration: 0.35 }}
      className={cn("shrink-0", className)}
    >
      <div className="mt-6 mx-auto max-w-3xl px-4 pb-2 pt-6 md:pb-3 md:pt-7">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-balance text-base font-medium text-muted-foreground md:text-lg">
            Start a conversation
          </h2>
          <p className="mt-1 text-pretty text-sm leading-snug text-muted-foreground">
            Ask anything — explanations, code, writing, or everyday questions.
          </p>
        </div>

        <div className="mx-auto mt-4 max-w-xl text-left">
          <p className="text-sm font-medium text-muted-foreground">
            Example queries:
          </p>
          <ul className="mt-1.5 space-y-1">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => onSelect?.(prompt)}
                  className={cn(
                    "flex w-full gap-2 rounded-md px-1 py-0.5 text-left text-sm leading-tight text-muted-foreground transition-colors",
                    onSelect && "hover:bg-muted/60 hover:text-foreground cursor-pointer",
                  )}
                >
                  <span className="select-none" aria-hidden>•</span>
                  <span className="min-w-0">&ldquo;{prompt}&rdquo;</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
