"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import Link from "next/link";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function AnonymousBanner() {
  const { data } = useAnonymousSession();
  const reduce = useReducedMotion();

  if (!data) return null;

  const { remaining, limit } = data;
  const limitReached = remaining === 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : easeOut}
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm",
        limitReached
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border/60 bg-muted/40 text-muted-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-muted/30",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 opacity-80" />
        {limitReached ? (
          <span className="leading-snug">
            Free limit reached. Sign up for unlimited conversations.
          </span>
        ) : (
          <span className="leading-snug">
            {remaining} of {limit} free questions remaining
          </span>
        )}
      </div>
      <Link
        href="/signup"
        className="inline-flex h-7 shrink-0 items-center rounded-lg border border-border/80 bg-background/90 px-2.5 text-base font-medium shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-muted hover:shadow active:scale-[0.98]"
      >
        Sign up free
      </Link>
    </motion.div>
  );
}
