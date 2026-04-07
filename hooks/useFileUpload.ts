"use client";

import { useEffect, useState } from "react";
import { getAnonSessionId } from "@/lib/api-client";
import type { MessageAttachment } from "@/types/db";

/** Set from `/chat` home after upload so `ChatView` can show the attachment without a second picker. */
export const COMPOSER_SEED_KEY = (chatId: string) => `composer-seed-${chatId}`;

export interface PendingAttachment extends MessageAttachment {
  localId: string;
  uploading?: boolean;
  error?: string;
  /** Object URL for local image preview before the upload completes. */
  localPreviewUrl?: string;
}

export function useFileUpload(chatId: string) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem(COMPOSER_SEED_KEY(chatId));
    if (!raw) return;
    sessionStorage.removeItem(COMPOSER_SEED_KEY(chatId));
    try {
      const parsed = JSON.parse(raw) as PendingAttachment[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAttachments(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [chatId]);

  async function uploadImage(file: File) {
    const localId = crypto.randomUUID();
    const localPreviewUrl = URL.createObjectURL(file);
    const preview: PendingAttachment = {
      localId,
      type: "image",
      name: file.name,
      uploading: true,
      localPreviewUrl,
    };

    setAttachments((prev) => [...prev, preview]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/uploads/images?chatId=${encodeURIComponent(chatId)}`,
        {
          method: "POST",
          headers: { "x-anonymous-session-id": getAnonSessionId() },
          body: formData,
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const { url } = await res.json();

      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId ? { ...a, url, uploading: false } : a,
        ),
      );
    } catch (err) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId
            ? { ...a, uploading: false, error: (err as Error).message }
            : a,
        ),
      );
    }
  }

  async function uploadDocument(file: File) {
    const localId = crypto.randomUUID();
    const pending: PendingAttachment = {
      localId,
      type: "document",
      name: file.name,
      uploading: true,
    };

    setAttachments((prev) => [...prev, pending]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/uploads/documents?chatId=${encodeURIComponent(chatId)}`,
        {
          method: "POST",
          headers: { "x-anonymous-session-id": getAnonSessionId() },
          body: formData,
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const { document } = await res.json();

      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId
            ? { ...a, uploading: false, document_id: document.id }
            : a,
        ),
      );
    } catch (err) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === localId
            ? { ...a, uploading: false, error: (err as Error).message }
            : a,
        ),
      );
    }
  }

  function removeAttachment(localId: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId);
      if (target?.localPreviewUrl) URL.revokeObjectURL(target.localPreviewUrl);
      return prev.filter((a) => a.localId !== localId);
    });
  }

  function clearAttachments() {
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.localPreviewUrl) URL.revokeObjectURL(a.localPreviewUrl);
      }
      return [];
    });
  }

  return {
    attachments,
    uploadImage,
    uploadDocument,
    removeAttachment,
    clearAttachments,
  };
}
