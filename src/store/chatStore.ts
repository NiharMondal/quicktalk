import { create } from "zustand";
import type { Room } from "@/types";

/**
 * Cross-component shared state (Rule 9). Holds volatile, widely-shared chat
 * state — rooms, the active room, per-room unread counts, and online presence.
 * Session-level values (user, socket) live in Context, not here; server data
 * fetched per-view (messages) lives in hooks, not here.
 */
interface ChatStore {
  // Rooms
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  upsertRoom: (room: Room) => void;

  // Active room
  activeRoomId: string | null;
  setActiveRoomId: (id: string) => void;

  // Unread counts: roomId → count
  unreadCounts: Record<string, number>;
  setUnreadCounts: (counts: Record<string, number>) => void;
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;

  // Online presence: Set of userId strings
  onlineUsers: Set<string>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  upsertRoom: (room) =>
    set((state) => {
      const index = state.rooms.findIndex((r) => r._id === room._id);
      if (index === -1) {
        return { rooms: [...state.rooms, room] };
      }
      const next = [...state.rooms];
      next[index] = room;
      return { rooms: next };
    }),

  activeRoomId: null,
  setActiveRoomId: (id) => set({ activeRoomId: id }),

  unreadCounts: {},
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  incrementUnread: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] ?? 0) + 1,
      },
    })),
  clearUnread: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),

  onlineUsers: new Set<string>(),
  setUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),
  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
}));