"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useChatStore } from "@/store/chatStore";

interface TypingIndicatorProps {
  roomId: string;
}

/** Auto-clear a typing user after this long without a refresh (missed stop event). */
const TYPING_TIMEOUT_MS = 5000;

export default function TypingIndicator({ roomId }: TypingIndicatorProps): React.ReactElement | null {
  const { socket } = useSocket();
  const { user } = useAuth();
  const rooms = useChatStore((s) => s.rooms);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [trackedRoomId, setTrackedRoomId] = useState(roomId);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear typing state immediately when the room changes (render-phase reset).
  if (roomId !== trackedRoomId) {
    setTrackedRoomId(roomId);
    setTypingUserIds([]);
  }

  useEffect(() => {
    const timers = timersRef.current;

    const onTyping = (data: { userId: string; roomId: string }): void => {
      if (data.roomId !== roomId || data.userId === user?._id) return;
      setTypingUserIds((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));

      const existing = timers.get(data.userId);
      if (existing) clearTimeout(existing);
      timers.set(
        data.userId,
        setTimeout(() => {
          setTypingUserIds((prev) => prev.filter((id) => id !== data.userId));
          timers.delete(data.userId);
        }, TYPING_TIMEOUT_MS),
      );
    };

    const onStopped = (data: { userId: string; roomId: string }): void => {
      if (data.roomId !== roomId) return;
      setTypingUserIds((prev) => prev.filter((id) => id !== data.userId));
      const existing = timers.get(data.userId);
      if (existing) {
        clearTimeout(existing);
        timers.delete(data.userId);
      }
    };

    socket.on("user_typing", onTyping);
    socket.on("user_stopped_typing", onStopped);
    return () => {
      socket.off("user_typing", onTyping);
      socket.off("user_stopped_typing", onStopped);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [socket, roomId, user?._id]);

  const typingNames = useMemo<string[]>(() => {
    const room = rooms.find((r) => r._id === roomId);
    if (!room) return [];
    return typingUserIds
      .map((id) => room.members.find((m) => m._id === id)?.username)
      .filter((name): name is string => Boolean(name));
  }, [rooms, roomId, typingUserIds]);

  if (typingNames.length === 0) return null;

  const label =
    typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing`
        : "Several people are typing";

  return (
    <div className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-xs">
      <span className="flex gap-1">
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current" />
      </span>
      <span>{label}</span>
    </div>
  );
}
