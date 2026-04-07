"use client";

import { FileText, ImageIcon, Loader2, Paperclip, Send, Square, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { chatComposerTextareaClassName } from "@/components/chat/chat-input-classes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PendingAttachment } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "@/types/db";

interface Props {
  onSend: (content: string, attachments: MessageAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  attachments: PendingAttachment[];
  onUploadImage: (file: File) => void;
  onUploadDocument: (file: File) => void;
  onRemoveAttachment: (localId: string) => void;
  disabled?: boolean;
  /** From `?upload=image|document` after creating a chat from the home screen */
  autoOpenUpload?: "image" | "document" | null;
  onAutoOpenUploadConsumed?: () => void;
  /** Use instead of inline file uploads (e.g. `/chat` before a chat id exists). */
  attachmentLaunchers?: {
    onImage: () => void | Promise<void>;
    onDocument: () => void | Promise<void>;
  };
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  attachments,
  onUploadImage,
  onUploadDocument,
  onRemoveAttachment,
  disabled,
  autoOpenUpload,
  onAutoOpenUploadConsumed,
  attachmentLaunchers,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const autoOpenDone = useRef(false);

  const hasUploading = attachments.some((a) => a.uploading);

  useEffect(() => {
    if (attachmentLaunchers) return;
    if (!autoOpenUpload) {
      autoOpenDone.current = false;
      return;
    }
    if (autoOpenDone.current) return;
    autoOpenDone.current = true;
    const id = requestAnimationFrame(() => {
      if (autoOpenUpload === "image") imageInputRef.current?.click();
      else docInputRef.current?.click();
      onAutoOpenUploadConsumed?.();
    });
    return () => {
      cancelAnimationFrame(id);
      autoOpenDone.current = false;
    };
  }, [attachmentLaunchers, autoOpenUpload, onAutoOpenUploadConsumed]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || hasUploading) return;

    onSend(trimmed, attachments);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
    }
  }, [value, isStreaming, hasUploading, onSend, attachments]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  // Handle image paste
  function handlePaste(e: React.ClipboardEvent) {
    if (attachmentLaunchers) return;
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onUploadImage(file);
        }
      }
    }
  }

  // Handle drag and drop
  function handleDrop(e: React.DragEvent) {
    if (attachmentLaunchers) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        onUploadImage(file);
      }
    }
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed here");
        continue;
      }
      onUploadImage(file);
    }
    e.target.value = "";
  }

  function handleDocFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      onUploadDocument(file);
    }
    e.target.value = "";
  }

  return (
    <div className="bg-background/95 px-4 pb-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-3xl border-t border-border/80 pt-3">
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => {
              const previewSrc = att.localPreviewUrl ?? att.url;
              return (
                <div
                  key={att.localId}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border bg-muted/80 py-1 pl-1 pr-2.5 text-xs shadow-sm transition-[border-color,background-color,opacity] duration-200",
                    att.error
                      ? "border-destructive text-destructive"
                      : att.uploading
                        ? "border-border/50 opacity-70"
                        : "border-border/80",
                  )}
                >
                  {/* Leading visual */}
                  {att.uploading ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : att.type === "image" && previewSrc ? (
                    <Image
                      src={previewSrc}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-border/50"
                    />
                  ) : att.type === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                  )}

                  <span className="max-w-32 truncate">
                    {att.error ?? att.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.localId)}
                    className="ml-0.5 shrink-0 rounded-full opacity-60 hover:opacity-100"
                    aria-label={`Remove ${att.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input row — items-center keeps placeholder, caret, and icons on one visual line */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop attachment target */}
        <div
          className="relative flex min-h-[3rem] items-center gap-2 rounded-2xl border border-border/80 bg-muted/30 px-2 py-1.5 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40 sm:px-3"
          onDrop={attachmentLaunchers ? (e) => e.preventDefault() : handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Attachment buttons */}
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 transition-transform duration-200 active:scale-95 active:translate-y-0"
              onClick={() =>
                attachmentLaunchers
                  ? void attachmentLaunchers.onImage()
                  : imageInputRef.current?.click()
              }
              disabled={isStreaming}
              type="button"
              title="Attach image"
            >
              <ImageIcon className="size-4 shrink-0" aria-hidden />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 transition-transform duration-200 active:scale-95 active:translate-y-0"
              onClick={() =>
                attachmentLaunchers
                  ? void attachmentLaunchers.onDocument()
                  : docInputRef.current?.click()
              }
              disabled={isStreaming}
              type="button"
              title="Attach document (PDF, TXT, MD)"
            >
              <Paperclip className="size-4 shrink-0" aria-hidden />
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={attachmentLaunchers ? undefined : handlePaste}
            placeholder=" Message AI Chat…"
            rows={1}
            disabled={disabled}
            className={chatComposerTextareaClassName()}
          />

          {/* Send / Stop */}
          {isStreaming ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 transition-transform duration-200 active:scale-95 active:translate-y-0"
              onClick={onStop}
              type="button"
              title="Stop generating"
            >
              <Square className="size-4 fill-current" aria-hidden />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              className="shrink-0 transition-transform duration-200 active:scale-95 active:translate-y-0"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled || hasUploading}
              type="button"
              title="Send message"
            >
              <Send
                className="size-4 shrink-0 block"
                strokeWidth={2}
                aria-hidden
              />
            </Button>
          )}
        </div>

        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          AI can make mistakes. Press Enter to send, Shift+Enter for new line.
        </p>
      </div>

      {/* Hidden file inputs */}
      {!attachmentLaunchers && (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageFileChange}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            className="hidden"
            onChange={handleDocFileChange}
          />
        </>
      )}
    </div>
  );
}
