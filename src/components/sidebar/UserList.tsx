"use client";

import { useMemo } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import type { User } from "@/types";

export default function UserList(): React.ReactElement {
  const rooms = useChatStore((s) => s.rooms);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const { user } = useAuth();

  // The only client-side source of User objects is room membership. Collect the
  // unique members across all rooms, drop self, and keep those the live presence
  // Set reports as online.
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

  if (online.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-4 text-center text-sm">No one else is online.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 px-2">
      {online.map((u) => (
        <li key={u._id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <Avatar name={u.username} src={u.avatarUrl} size="sm" isOnline />
          <span className="flex-1 truncate text-sm">{u.username}</span>
        </li>
      ))}
    </ul>
  );
}
