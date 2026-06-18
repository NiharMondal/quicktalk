import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import type { Room } from "@/types";

interface UseRoomsResult {
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      return data.message;
    }
    return err.message;
  }
  return "Failed to load rooms";
}

/**
 * Fetches the current user's rooms (`GET /rooms`) and stores them in the
 * Zustand chat store (rooms are shared cross-component state, Rule 9). Lives in
 * a hook so the call never sits directly inside a component `useEffect` (Rule 7);
 * exposes the standard `{ data, isLoading, error }` shape plus `refetch` for
 * error-state recovery (Rule 14).
 */
export function useRooms(): UseRoomsResult {
  const rooms = useChatStore((s) => s.rooms);
  const setRooms = useChatStore((s) => s.setRooms);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the fetch effect (used by refetch / retry).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      try {
        const { data } = await api.get<Room[]>("/rooms");
        if (!active) return;
        setRooms(data);
        setError(null);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [setRooms, reloadKey]);

  const refetch = useCallback((): void => {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  return { rooms, isLoading, error, refetch };
}
