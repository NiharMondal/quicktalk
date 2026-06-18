"use client";

import { createContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSocket, disconnectSocket, type AppSocket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";
import { useChatStore } from "@/store/chatStore";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

/**
 * Session-level socket access (Rule 9). Owns the single Socket.io connection's
 * lifecycle — connect once `user` is non-null, disconnect when it becomes null
 * (Rule 8) — and hosts the app-wide presence/notification listeners that feed
 * the Zustand store.
 */
export interface SocketContextValue {
  socket: AppSocket;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps): React.ReactElement {
  const { user } = useAuth();
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();

  const setUserOnline = useChatStore((s) => s.setUserOnline);
  const setUserOffline = useChatStore((s) => s.setUserOffline);
  const incrementUnread = useChatStore((s) => s.incrementUnread);
  const setUnreadCounts = useChatStore((s) => s.setUnreadCounts);

  // Connect when authenticated; tear the singleton down on logout / session end.
  useEffect(() => {
    if (!user) return;
    socket.connect();
    return () => {
      disconnectSocket();
    };
  }, [user, socket]);

  // Hydrate per-room unread counts from the REST endpoint on login/refresh.
  useEffect(() => {
    if (!user) return;

    async function fetchUnread(): Promise<void> {
      const { data } = await api.get<Array<{ roomId: string; unreadCount: number }>>("/notifications/unread");
      const counts = Object.fromEntries(data.map((item) => [item.roomId, item.unreadCount]));
      setUnreadCounts(counts);
    }

    void fetchUnread();
  }, [user, setUnreadCounts]);

  // Track connection status for consumers (e.g. a "reconnecting" banner).
  useEffect(() => {
    const onConnect = (): void => setIsConnected(true);
    const onDisconnect = (): void => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // App-wide presence + notification listeners → Zustand store (Rule 8 cleanup).
  useEffect(() => {
    const onUserOnline = (data: { userId: string }): void => setUserOnline(data.userId);
    const onUserOffline = (data: { userId: string }): void => setUserOffline(data.userId);
    const onNotification = (data: Notification): void => {
      if (useChatStore.getState().activeRoomId === data.roomId) return;
      incrementUnread(data.roomId);
      toast("New message", {
        description: data.preview,
        action: {
          label: "View",
          onClick: () => router.push(`/${data.roomId}`),
        },
      });
    };

    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("notification", onNotification);
    return () => {
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
      socket.off("notification", onNotification);
    };
  }, [socket, setUserOnline, setUserOffline, incrementUnread, router]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
