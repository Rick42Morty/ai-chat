"use client";

import type { ApiError } from "@/types/api";

const ANON_SESSION_KEY = "anon-session-id";

export function getAnonSessionId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(ANON_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_SESSION_KEY, id);
  }
  return id;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const anonId = getAnonSessionId();
  const headers = new Headers(init?.headers);
  if (anonId) headers.set("x-anonymous-session-id", anonId);
  headers.set("Content-Type", "application/json");

  const res = await fetch(path, { ...init, headers });

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({
      error: "Request failed",
    }));
    throw new Error(body.error ?? "Request failed");
  }

  return res.json() as T;
}

export const apiClient = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
