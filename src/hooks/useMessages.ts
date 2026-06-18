import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import type { Message } from "@/types";

const PAGE_SIZE = 30;

interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  refetch: () => void;
}

/** Sort ascending (oldest first) so older messages render above newer ones. */
function sortAsc(list: Message[]): Message[] {
  return [...list].sort((a, b) => {
    const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return delta !== 0 ? delta : a._id.localeCompare(b._id);
  });
}

function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      return data.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Failed to load messages";
}

/**
 * Cursor-paginated message history for a room, merged with real-time
 * `message_received` events (Rules 10 & 12).
 *
 * - Initial load + room switch: refetch the latest page from scratch.
 * - `loadMore()`: fetch older messages (`before=<oldest _id>`) and prepend them.
 * - Real-time messages are appended (deduped by `_id`).
 *
 * The backend returns `Message[]`; `hasMore` is derived from page size
 * (a full page implies more may exist), and order is normalized client-side.
 */
export function useMessages(roomId: string): UseMessagesResult {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedRoomId, setLoadedRoomId] = useState(roomId);
  // Bumping this re-runs the initial fetch (used by refetch / retry).
  const [reloadKey, setReloadKey] = useState(0);
  // Guards against overlapping loadMore() calls (e.g. rapid scrolling).
  const isLoadingMoreRef = useRef(false);

  // Reset to a clean loading state the moment the room changes — React's
  // sanctioned "adjust state during render" pattern, so the previous room's
  // messages never flash before the new fetch resolves.
  if (roomId !== loadedRoomId) {
    setLoadedRoomId(roomId);
    setMessages([]);
    setError(null);
    setHasMore(false);
    setIsLoading(true);
  }

  // Initial load + refetch whenever the room changes.
  useEffect(() => {
    let active = true;

    async function fetchInitial(): Promise<void> {
      try {
        const { data } = await api.get<Message[]>(`/messages/${roomId}`, {
          params: { limit: PAGE_SIZE },
        });
        if (!active) return;
        setMessages(sortAsc(data));
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void fetchInitial();
    return () => {
      active = false;
    };
  }, [roomId, reloadKey]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (isLoadingMoreRef.current || !hasMore || messages.length === 0) return;
    isLoadingMoreRef.current = true;
    const oldestId = messages[0]._id;
    try {
      const { data } = await api.get<Message[]>(`/messages/${roomId}`, {
        params: { limit: PAGE_SIZE, before: oldestId },
      });
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m._id));
        const older = data.filter((m) => !seen.has(m._id));
        return sortAsc([...older, ...prev]);
      });
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [roomId, hasMore, messages]);

  // Merge real-time messages for this room (Rule 8: cleanup the listener).
  useEffect(() => {
    const onMessageReceived = (data: { message: Message }): void => {
      if (data.message.roomId !== roomId) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === data.message._id)) return prev;
        return sortAsc([...prev, data.message]);
      });
    };

    socket.on("message_received", onMessageReceived);
    return () => {
      socket.off("message_received", onMessageReceived);
    };
  }, [socket, roomId]);

  // Retry entry point for the error state (Rule 14): reset and re-run the fetch.
  const refetch = useCallback((): void => {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  return { messages, isLoading, error, loadMore, hasMore, refetch };
}
