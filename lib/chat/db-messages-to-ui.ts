import type { UIMessage } from "ai";
import type { Message } from "@/types/db";

/** Custom part stored alongside standard AI SDK parts for document attachments. */
export interface DocumentAttachmentPart {
  type: "document-attachment";
  name: string;
  document_id: string;
  mime_type?: string;
}

export function dbMessagesToUIMessages(rows: Message[]): UIMessage[] {
  return rows.map((msg) => {
    // Build parts as a wider type so we can include custom document parts
    const parts: (UIMessage["parts"][number] | DocumentAttachmentPart)[] = [];

    if (msg.content) {
      parts.push({ type: "text", text: msg.content });
    }
    for (const att of msg.attachments ?? []) {
      if (att.type === "image" && att.url) {
        parts.push({
          type: "file",
          mediaType: (att.mime_type ?? "image/jpeg") as `${string}/${string}`,
          url: att.url,
        });
      } else if (att.type === "document" && att.document_id) {
        parts.push({
          type: "document-attachment",
          name: att.name,
          document_id: att.document_id,
          mime_type: att.mime_type,
        });
      }
    }
    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts,
    } as UIMessage;
  });
}

function textFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * When history refetches after a stream, DB message ids can differ from client
 * stream ids. Reusing stable ids for matching rows avoids React key changes and
 * stops list items from remounting (flicker, repeated entrance animations).
 */
export function mergeUIMessageIdsPreserve(
  prev: UIMessage[],
  fromDb: UIMessage[],
): UIMessage[] {
  // DB can lag behind the client (first send, stream not persisted yet). Never
  // drop trailing client-only messages when the server returns fewer rows.
  if (fromDb.length < prev.length) {
    const prefix = fromDb.map((msg, i) => {
      const p = prev[i];
      if (!p || p.role !== msg.role) return msg;
      if (textFromUIMessage(p) === textFromUIMessage(msg)) {
        return { ...msg, id: p.id };
      }
      return msg;
    });
    return [...prefix, ...prev.slice(fromDb.length)];
  }

  // Initial history load or refetch with more rows than currently in memory:
  // preserve client ids where rows align by index.
  if (fromDb.length > prev.length) {
    return fromDb.map((msg, i) => {
      if (i < prev.length) {
        const p = prev[i];
        if (!p || p.role !== msg.role) return msg;
        if (textFromUIMessage(p) === textFromUIMessage(msg)) {
          return { ...msg, id: p.id };
        }
      }
      return msg;
    });
  }

  return fromDb.map((msg, i) => {
    const p = prev[i];
    if (!p || p.role !== msg.role) return msg;
    if (textFromUIMessage(p) === textFromUIMessage(msg)) {
      return { ...msg, id: p.id };
    }
    return msg;
  });
}
