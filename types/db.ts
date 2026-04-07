export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string | null;
  session_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface MessageAttachment {
  type: "image" | "document";
  url?: string; // for images
  document_id?: string; // for documents (DB id)
  name: string;
  mime_type?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  attachments: MessageAttachment[];
  created_at: string;
}

export interface AnonymousSession {
  id: string;
  questions_used: number;
  created_at: string;
  last_seen_at: string;
}

export interface Document {
  id: string;
  chat_id: string;
  user_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  text_content: string | null;
  created_at: string;
}
