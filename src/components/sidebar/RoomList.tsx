"use client";

import Link from "next/link";
import { useRooms } from "@/hooks/useRooms";
import { useAuth } from "@/hooks/useAuth";
import { useChatStore } from "@/store/chatStore";
import Avatar from "@/components/shared/Avatar";
import Loader from "@/components/shared/Loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Room } from "@/types";

interface RoomDisplay {
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

/** Derive how a room is presented: direct rooms show the other member. */
function getRoomDisplay(room: Room, currentUserId: string | undefined, isOnline: (id: string) => boolean): RoomDisplay {
  if (room.type === "direct") {
    const other = room.members.find((m) => m._id !== currentUserId);
    if (other) {
      return { name: other.username, avatarUrl: other.avatarUrl, isOnline: isOnline(other._id) };
    }
  }
  return { name: room.name };
}

export default function RoomList(): React.ReactElement {
  const { rooms, isLoading, error, refetch } = useRooms();
  const { user } = useAuth();
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  if (isLoading) {
    return <Loader size="sm" label="Loading rooms" className="py-8" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-8 text-center text-sm">
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 px-2">
      {rooms.map((room) => {
        const display = getRoomDisplay(room, user?._id, (id) => onlineUsers.has(id));
        const unread = unreadCounts[room._id] ?? 0;
        const isActive = activeRoomId === room._id;

        return (
          <li key={room._id}>
            <Link
              href={`/${room._id}`}
              onClick={() => {
                setActiveRoomId(room._id);
                clearUnread(room._id);
              }}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <Avatar name={display.name} src={display.avatarUrl} size="md" isOnline={display.isOnline} />
              <span className="flex-1 truncate text-sm font-medium">{display.name}</span>
              {unread > 0 ? (
                <Badge variant="default" className="shrink-0">
                  {unread > 99 ? "99+" : unread}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
