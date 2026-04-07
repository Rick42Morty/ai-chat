"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: Props) {
  return (
    <div
      className={cn(
        "prose prose-sm font-sans dark:prose-invert max-w-none",
        "prose-p:leading-relaxed prose-p:my-1",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
        "prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0",
        "prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
        "prose-headings:my-2",
        "prose-blockquote:border-l-primary",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
