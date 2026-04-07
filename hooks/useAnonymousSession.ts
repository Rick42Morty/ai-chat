"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AnonymousSessionResponse } from "@/types/api";

export function useAnonymousSession() {
  return useQuery({
    queryKey: ["anon-session"],
    queryFn: () =>
      apiClient.get<AnonymousSessionResponse>("/api/anonymous/session"),
    staleTime: 0,
  });
}
