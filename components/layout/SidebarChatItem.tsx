"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteChat, useRenameChat } from "@/hooks/useChatList";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types/db";

interface Props {
  chat: Chat;
  isActive: boolean;
  onNavigate?: () => void;
}

export function SidebarChatItem({ chat, isActive, onNavigate }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const deleteChat = useDeleteChat();
  const renameChat = useRenameChat();
  const isDeletingThis =
    deleteChat.isPending && deleteChat.variables === chat.id;

  useEffect(() => {
    setEditTitle(chat.title);
  }, [chat.id, chat.title]);

  async function handleRename() {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === chat.title) {
      setIsEditing(false);
      setEditTitle(chat.title);
      return;
    }
    try {
      await renameChat.mutateAsync({ chatId: chat.id, title: trimmed });
    } catch {
      toast.error("Failed to rename chat");
    } finally {
      setIsEditing(false);
    }
  }

  async function handleDelete(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await deleteChat.mutateAsync(chat.id);
      if (isActive) router.push("/chat");
    } catch {
      toast.error("Failed to delete chat");
    }
  }

  if (isEditing) {
    return (
      <div className="px-1 py-0.5">
        <input
          ref={inputRef}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setIsEditing(false);
              setEditTitle(chat.title);
            }
          }}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center rounded-lg px-2 py-1.5 text-sm transition-[background-color,font-weight] duration-150 hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent font-medium shadow-sm",
      )}
    >
      <Link
        href={`/chat/${chat.id}`}
        className="min-w-0 flex-1 truncate pr-1"
        onClick={onNavigate}
      >
        {chat.title}
      </Link>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isDeletingThis}
        className="shrink-0 text-muted-foreground opacity-70 transition-[opacity,color] hover:text-destructive hover:opacity-100 disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100"
        title="Delete chat"
        aria-label={`Delete ${chat.title}`}
        onClick={handleDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          onClick={(e: React.MouseEvent) => e.preventDefault()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => inputRef.current?.select(), 0);
            }}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
