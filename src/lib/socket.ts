import { io, type Socket } from "socket.io-client";
import type { Message, Notification } from "@/types";

/**
 * Socket.io event contracts — backend owns these. Never emit or listen for an
 * event not declared here. Typing both directions makes `socket.emit` / `socket.on`
 * fully type-checked (Rule 8: emit helpers are typed).
 */
export interface ServerToClientEvents {
  message_received: (data: { message: Message }) => void;
  messages_read: (data: { userId: string; roomId: string; messageIds: string[] }) => void;
  user_typing: (data: { userId: string; roomId: string }) => void;
  user_stopped_typing: (data: { userId: string; roomId: string }) => void;
  user_online: (data: { userId: string }) => void;
  user_offline: (data: { userId: string }) => void;
  notification: (data: Notification) => void;
}

export interface ClientToServerEvents {
  join_room: (data: { roomId: string }) => void;
  leave_room: (data: { roomId: string }) => void;
  send_message: (data: { roomId: string; content: string; type: Message["type"] }) => void;
  mark_read: (data: { roomId: string }) => void;
  typing_start: (data: { roomId: string }) => void;
  typing_stop: (data: { roomId: string }) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * The single Socket.io-client instance for the entire session (Rule 8).
 * Created lazily and reused; `SocketContext` calls `connect()`/`disconnect()`
 * based on auth state.
 */
let socket: AppSocket | null = null;

/**
 * Returns the session-wide socket singleton, creating it on first call.
 *
 * - `autoConnect: false` — the socket connects only once `user` is non-null
 *   (handled by `SocketContext`), never on import.
 * - `withCredentials: true` — sends the httpOnly auth cookie on the handshake,
 *   matching how the backend authenticates the connection.
 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "", {
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
}

/**
 * Tears down the singleton: disconnects and clears the reference so the next
 * login starts a fresh connection with no stale listeners. Called by
 * `SocketContext` when `user` becomes null (logout / session expiry).
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
