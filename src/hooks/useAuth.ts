import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/context/AuthContext";

/**
 * Consume AuthContext. Throws if used outside an AuthProvider (Rule 10) so the
 * mistake surfaces immediately rather than as a confusing null-access error.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
