import axios, { AxiosError, type AxiosInstance } from "axios";

/** localStorage key under which the Bearer token is persisted. */
const TOKEN_STORAGE_KEY = "auth_token";

/**
 * Singleton Axios instance used for every HTTP call in the app.
 * Components must never call `fetch` or `axios` directly — always import `api`.
 *
 * Auth is Bearer-token based: the backend returns a token on login which we
 * attach as the `Authorization` header on every request. `withCredentials` is
 * kept on in case the backend additionally relies on a cookie.
 */
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Read the persisted token (browser only; null during SSR). */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Set or clear the Bearer token used for every request. Mirrors it onto the
 * Axios default `Authorization` header so all calls carry it, and persists it
 * to localStorage so it survives a full page refresh.
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } else {
    delete api.defaults.headers.common.Authorization;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

// Restore a persisted token into the header at module load (client only) so a
// page refresh keeps the session authenticated.
const persistedToken = getAuthToken();
if (persistedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${persistedToken}`;
}

/**
 * The backend wraps every response in an envelope: `{ success, message, meta,
 * result }`. Unwrap `result` here so callers receive the raw payload directly
 * (e.g. `api.get<User>("/auth/me")` resolves with the User, not the envelope).
 *
 * The error handler is the global 401 guard: clear the (now-invalid) token and
 * bounce to /login. Guarded against SSR and a redirect loop on the auth pages.
 */
api.interceptors.response.use(
  (response) => {
    const body: unknown = response.data;
    if (body && typeof body === "object" && "result" in body) {
      response.data = (body as { result: unknown }).result;
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      setAuthToken(null);
      const { pathname } = window.location;
      if (pathname !== "/login" && pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export { api };
