import type { Chat, Document, Message, Profile } from "./db";

// Auth
export interface MeResponse {
  user: Profile;
}

// Chats
export interface CreateChatRequest {
  title?: string;
}

export interface CreateChatResponse {
  chat: Chat;
}

export interface ListChatsResponse {
  chats: Chat[];
  nextCursor: string | null;
}

export interface ListMessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

// Uploads
export interface UploadImageResponse {
  url: string;
}

export interface UploadDocumentResponse {
  document: Document;
}

// Anonymous
export interface AnonymousSessionResponse {
  questions_used: number;
  limit: number;
  remaining: number;
}

// Errors
export interface ApiError {
  error: string;
  code?: string;
}
