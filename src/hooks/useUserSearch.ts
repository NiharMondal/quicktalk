import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import type { User } from "@/types";

export const USER_SEARCH_MIN_LEN = 2;
const DEBOUNCE_MS = 700;

interface UseUserSearchResult {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      return data.message;
    }
    return err.message;
  }
  return "Search failed";
}

/**
 * Debounced user search against `GET /users?search=<query>`.
 * isLoading is derived from whether the current trimmed query matches the last
 * completed fetch — no synchronous setState inside effects.
 */
export function useUserSearch(query: string): UseUserSearchResult {
  // activeQuery = the trimmed query whose results/error are currently displayed.
  const [activeQuery, setActiveQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (trimmed.length < USER_SEARCH_MIN_LEN) return;

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      api
        .get<User[]>("/users/search", { params: { search: trimmed }, signal: controller.signal })
        .then(({ data }) => {
          setUsers(data);
          setError(null);
          setActiveQuery(trimmed);
        })
        .catch((err: unknown) => {
          if (isAxiosError(err) && err.code === "ERR_CANCELED") return;
          setError(getErrorMessage(err));
          setUsers([]);
          setActiveQuery(trimmed);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const trimmed = query.trim();
  const isLoading = trimmed.length >= USER_SEARCH_MIN_LEN && trimmed !== activeQuery;

  return { users, isLoading, error };
}
