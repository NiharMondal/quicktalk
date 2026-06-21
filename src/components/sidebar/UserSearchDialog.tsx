"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import { useUserSearch, USER_SEARCH_MIN_LEN } from "@/hooks/useUserSearch";
import Avatar from "@/components/shared/Avatar";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Room } from "@/types";

export default function UserSearchDialog(): React.ReactElement {
  const router = useRouter();
  const upsertRoom = useChatStore((s) => s.upsertRoom);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

  const { users, isLoading, error } = useUserSearch(query);

  const trimmed = query.trim();
  const isIdle = trimmed.length < USER_SEARCH_MIN_LEN;
  const isEmpty = !isIdle && !isLoading && !error && users.length === 0;
  const hasResults = !isIdle && !isLoading && !error && users.length > 0;

  function handleOpenChange(value: boolean): void {
    setOpen(value);
    if (!value) setQuery("");
  }

  async function openDirect(userId: string): Promise<void> {
    if (messagingUserId) return;
    setMessagingUserId(userId);
    try {
      const { data } = await api.post<Room>("/rooms/direct", { userId });
      upsertRoom(data);
      setActiveRoomId(data._id);
      router.replace(`/${data._id}`);
      handleOpenChange(false);
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : "Failed to open chat";
      toast.error(msg);
    } finally {
      setMessagingUserId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Find people">
          <SearchIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Find people</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="min-h-32">
          {isIdle && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Type at least {USER_SEARCH_MIN_LEN} characters to search.
            </p>
          )}
          {isLoading && <Loader size="sm" label="Searching…" className="py-8" />}
          {isEmpty && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No users found for &ldquo;{trimmed}&rdquo;.
            </p>
          )}
          {error && !isIdle && !isLoading && (
            <p className="text-destructive py-8 text-center text-sm">{error}</p>
          )}
          {hasResults && (
            <ul className="flex flex-col gap-1 pt-1">
              {users.map((u) => (
                <li key={u._id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <Avatar name={u.username} src={u.avatarUrl} size="md" isOnline={onlineUsers.has(u._id)} />
                  <span className="flex-1 truncate text-sm font-medium">{u.username}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!messagingUserId}
                    onClick={() => void openDirect(u._id)}
                  >
                    {messagingUserId === u._id ? "Opening…" : "Message"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
