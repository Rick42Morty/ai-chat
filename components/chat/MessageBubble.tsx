"use client";

import type { UIMessage } from "ai";
import { Bot, FileText, User } from "lucide-react";
import Image from "next/image";
import { StreamingCursor } from "@/components/chat/StreamingCursor";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import type { DocumentAttachmentPart } from "@/lib/chat/db-messages-to-ui";
import { cn } from "@/lib/utils";

interface Props {
  message: UIMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  // Cast to a wider type so our custom document-attachment parts are accessible
  const parts = message.parts as Array<{ type: string }>;
  const textParts = parts.filter((p) => p.type === "text");
  const fileParts = parts.filter((p) => p.type === "file");
  const docParts = parts
    .filter((p) => p.type === "document-attachment") as unknown as DocumentAttachmentPart[];

  const textContent = textParts
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");

  return (
    <div
      className={cn(
        "flex items-start gap-3 transition-[transform,opacity] duration-200",
        isUser && "flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={cn("flex max-w-[80%] flex-col gap-2", isUser && "items-end")}
      >
        {/* Text bubble */}
        {textContent && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{textContent}</p>
            ) : isStreaming ? (
              <p className="whitespace-pre-wrap">
                {textContent}
                <StreamingCursor />
              </p>
            ) : (
              <MarkdownRenderer content={textContent} />
            )}
          </div>
        )}

        {/* Image attachments */}
        {fileParts.map((part) => {
          const filePart = part as { type: "file"; url?: string; mediaType?: string };
          if (filePart.url && filePart.mediaType?.startsWith("image/")) {
            return (
              <Image
                key={filePart.url}
                src={filePart.url}
                alt="Attached image"
                width={300}
                height={300}
                className="rounded-lg object-contain max-h-64 w-auto ring-1 ring-border/50 shadow-sm"
              />
            );
          }
          return null;
        })}

        {/* Document attachment chips */}
        {docParts.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5", isUser && "justify-end")}>
            {docParts.map((doc) => (
              <div
                key={doc.document_id}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/60 px-2.5 py-1 text-sm text-muted-foreground"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-48 truncate">{doc.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Thinking indicator when no content yet */}
        {!textContent && isStreaming && (
          <div className="rounded-2xl bg-muted px-4 py-3.5 text-sm">
            <span className="flex items-center gap-1">
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
          </div>
        )}
      </div>
    </div>
  );
}
