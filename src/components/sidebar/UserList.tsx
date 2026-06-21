"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { useChatStore } from "@/store/chatStore";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import Avatar from "@/components/shared/Avatar";
import type { Room, User } from "@/types";

export default function UserList(): React.ReactElement {
  const router = useRouter();
  const rooms = useChatStore((s) => s.rooms);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const upsertRoom = useChatStore((s) => s.upsertRoom);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);
  const { user } = useAuth();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const online = useMemo<User[]>(() => {
    const byId = new Map<string, User>();
    for (const room of rooms) {
      for (const member of room.members) {
        if (member._id !== user?._id && onlineUsers.has(member._id)) {
          byId.set(member._id, member);
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.username.localeCompare(b.username));
  }, [rooms, onlineUsers, user?._id]);

  async function openDirect(targetUser: User): Promise<void> {
    if (loadingUserId) return;
    setLoadingUserId(targetUser._id);
    try {
      const { data } = await api.post<Room>("/rooms/direct", { userId: targetUser._id });
      upsertRoom(data);
      setActiveRoomId(data._id);
      router.replace(`/${data._id}`);
    } catch (err) {
      const message = isAxiosError(err) ? (err.response?.data as { message?: string })?.message ?? err.message : "Failed to open chat";
      toast.error(message);
    } finally {
      setLoadingUserId(null);
    }
  }

  if (online.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-4 text-center text-sm">No one else is online.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 px-2">
      {online.map((u) => (
        <li key={u._id}>
          <button
            type="button"
            disabled={!!loadingUserId}
            onClick={() => void openDirect(u)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50 disabled:opacity-50"
          >
            <Avatar name={u.username} src={u.avatarUrl} size="sm" isOnline />
            <span className="flex-1 truncate text-left text-sm">{u.username}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
