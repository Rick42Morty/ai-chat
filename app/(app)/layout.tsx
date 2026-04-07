"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useRealtimeChatSync } from "@/hooks/useRealtimeChatSync";
import { getAnonSessionId } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

function RealtimeSync() {
  const { user } = useAuth();
  const anonSessionId = user ? undefined : getAnonSessionId();
  useRealtimeChatSync(user?.id, anonSessionId);
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Only after auth resolves: hide sidebar for anonymous users; avoid flash before /api/auth/me */
  const showChatHistory = !loading && !!user;
  const isAnonymous = !loading && !user;

  return (
    <div className="flex h-screen overflow-hidden">
      {!loading && <RealtimeSync />}
      {showChatHistory && (
        <>
          <aside className="hidden w-64 shrink-0 overflow-hidden border-r border-sidebar-border md:flex md:flex-col">
            <Sidebar />
          </aside>

          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      )}

      <main className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b border-border/80 bg-background/90 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
            showChatHistory ? "px-3 md:hidden" : "px-4",
          )}
        >
          <div className="flex min-w-0 items-center">
            {showChatHistory && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <span
              className={cn(
                "truncate text-sm font-semibold",
                showChatHistory && "ml-2",
              )}
            >
              AI Chat
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAnonymous && (
              <Link
                href="/login"
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign in
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0">{children}</div>
      </main>
    </div>
  );
}
