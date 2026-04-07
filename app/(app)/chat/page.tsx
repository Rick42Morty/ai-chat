"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MessageInput } from "@/components/chat/MessageInput";
import { SuggestedPromptsList } from "@/components/chat/SuggestedPromptsList";
import { useCreateChat } from "@/hooks/useChatList";
import {
  COMPOSER_SEED_KEY,
  type PendingAttachment,
} from "@/hooks/useFileUpload";
import { getAnonSessionId } from "@/lib/api-client";

export default function ChatHomePage() {
  const router = useRouter();
  const createChat = useCreateChat();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingChip, setUploadingChip] = useState<PendingAttachment | null>(null);

  function handlePrompt(prompt: string) {
    const chatId = crypto.randomUUID();
    router.push(`/chat/${chatId}?prompt=${encodeURIComponent(prompt)}&new=1`);
  }

  async function onHomeImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed here");
      return;
    }
    setBusy(true);
    setUploadingChip({
      localId: "home-upload",
      type: "image",
      name: file.name,
      uploading: true,
      localPreviewUrl: URL.createObjectURL(file),
    });
    try {
      const { chat } = await createChat.mutateAsync(undefined);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/uploads/images?chatId=${encodeURIComponent(chat.id)}`,
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
      const localId = crypto.randomUUID();
      const seed: PendingAttachment[] = [
        {
          localId,
          type: "image",
          name: file.name,
          url,
          mime_type: file.type,
        },
      ];
      sessionStorage.setItem(COMPOSER_SEED_KEY(chat.id), JSON.stringify(seed));
      router.push(`/chat/${chat.id}`);
    } catch {
      toast.error("Failed to upload");
    } finally {
      setBusy(false);
    }
  }

  async function onHomeDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setUploadingChip({
      localId: "home-upload",
      type: "document",
      name: file.name,
      uploading: true,
    });
    try {
      const { chat } = await createChat.mutateAsync(undefined);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/uploads/documents?chatId=${encodeURIComponent(chat.id)}`,
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
      const localId = crypto.randomUUID();
      const seed: PendingAttachment[] = [
        {
          localId,
          type: "document",
          name: file.name,
          mime_type: document.mime_type ?? file.type,
          document_id: document.id,
        },
      ];
      sessionStorage.setItem(COMPOSER_SEED_KEY(chat.id), JSON.stringify(seed));
      router.push(`/chat/${chat.id}`);
    } catch {
      toast.error("Failed to upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SuggestedPromptsList onSelect={(p) => void handlePrompt(p)} />
        <div className="min-h-0 flex-1" aria-hidden />
      </div>
      <MessageInput
        onSend={(content) => void handlePrompt(content)}
        onStop={() => {}}
        isStreaming={false}
        attachments={uploadingChip ? [uploadingChip] : []}
        onUploadImage={() => {}}
        onUploadDocument={() => {}}
        onRemoveAttachment={() => setUploadingChip(null)}
        disabled={busy || createChat.isPending}
        attachmentLaunchers={{
          onImage: () => imageInputRef.current?.click(),
          onDocument: () => docInputRef.current?.click(),
        }}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onHomeImageFile}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        className="hidden"
        onChange={onHomeDocFile}
      />
    </div>
  );
}
