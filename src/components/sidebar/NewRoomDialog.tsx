"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Room, User } from "@/types";
import { cn } from "@/lib/utils";

export default function NewRoomDialog(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const rooms = useChatStore((s) => s.rooms);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const upsertRoom = useChatStore((s) => s.upsertRoom);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // All unique users we know about (from room memberships), excluding self.
  const knownUsers = useMemo<User[]>(() => {
    const byId = new Map<string, User>();
    for (const room of rooms) {
      for (const member of room.members) {
        if (member._id !== user?._id) {
          byId.set(member._id, member);
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.username.localeCompare(b.username));
  }, [rooms, user?._id]);

  function toggleUser(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleOpenChange(value: boolean): void {
    setOpen(value);
    if (!value) {
      setName("");
      setSelectedIds(new Set());
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      const { data } = await api.post<Room>("/rooms", {
        name: trimmed,
        type: "group",
        members: Array.from(selectedIds),
      });
      upsertRoom(data);
      setActiveRoomId(data._id);
      router.replace(`/${data._id}`);
      handleOpenChange(false);
    } catch (err) {
      const message =
        isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message ?? err.message
          : "Failed to create room";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="New group room">
          <PlusIcon className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New group room</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              placeholder="e.g. design, backend, general"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          {knownUsers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Add members
                {selectedIds.size > 0 && (
                  <span className="text-muted-foreground ml-1 font-normal">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </Label>
              <ScrollArea className="h-40 rounded-md border">
                <ul className="flex flex-col gap-0.5 p-1">
                  {knownUsers.map((u) => {
                    const selected = selectedIds.has(u._id);
                    return (
                      <li key={u._id}>
                        <button
                          type="button"
                          onClick={() => toggleUser(u._id)}
                          className={cn("flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent/50", {"bg-accent text-accent-foreground": selected})}
                        >
                          <Avatar
                            name={u.username}
                            src={u.avatarUrl}
                            size="sm"
                            isOnline={onlineUsers.has(u._id)}
                          />
                          <span className="flex-1 truncate text-left">{u.username}</span>
                          {selected && (
                            <span className="text-primary text-xs font-medium">✓</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </div>
          )}

          {knownUsers.length === 0 && (
            <p className="text-muted-foreground text-xs">
              You can invite people once the room is created.
            </p>
          )}

          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? "Creating…" : "Create room"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
