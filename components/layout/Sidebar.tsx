"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LogIn, LogOut, PenSquare } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SidebarChatItem } from "@/components/layout/SidebarChatItem";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useChatList } from "@/hooks/useChatList";
import { easeOut } from "@/lib/motion";
import { useAuth } from "@/providers/AuthProvider";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const params = useParams<{ chatId?: string }>();
  const { user, logout } = useAuth();
  const reduce = useReducedMotion();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatList();

  function handleNewChat() {
    router.push("/chat");
    onClose?.();
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 p-3">
        <Link
          href="/chat"
          className="text-base font-semibold px-1 transition-opacity hover:opacity-80"
        >
          AI Chat
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/80" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            title="New chat"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform duration-200 active:scale-95 dark:hover:bg-sidebar-accent/80"
          >
            <PenSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 min-h-0 px-2 py-2">
        {isLoading ? (
          <motion.div
            className="space-y-2 px-1"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: reduce ? 0 : 0.045,
                  delayChildren: 0.02,
                },
              },
            }}
          >
            {[
              "sidebar-sk-1",
              "sidebar-sk-2",
              "sidebar-sk-3",
              "sidebar-sk-4",
              "sidebar-sk-5",
              "sidebar-sk-6",
            ].map((id) => (
              <motion.div
                key={id}
                variants={{
                  hidden: { opacity: 0, x: -6 },
                  show: { opacity: 1, x: 0, transition: easeOut },
                }}
              >
                <div className="skeleton-line h-9 w-full rounded-lg" />
              </motion.div>
            ))}
          </motion.div>
        ) : isError ? (
          <p className="px-3 py-4 text-sm text-destructive">
            Could not load conversations
          </p>
        ) : (data?.chats ?? []).length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground leading-relaxed">
            No conversations yet
          </p>
        ) : (
          <>
            {(data?.chats ?? []).map((chat) => (
              <SidebarChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === params.chatId}
                onNavigate={onClose}
              />
            ))}
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-muted-foreground"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </>
        )}
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      <div className="p-3">
        {user ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 ring-1 ring-border/40">
              <AvatarFallback className="text-sm">
                {(user.display_name ?? user.email)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-base font-medium">
                {user.display_name ?? user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 transition-transform duration-200 active:scale-95"
              onClick={logout}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent active:scale-[0.99]"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
