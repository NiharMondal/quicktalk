import { useCallback, useContext } from "react";
import { SocketContext, type SocketContextValue } from "@/context/SocketContext";
import type { ClientToServerEvents } from "@/lib/socket";

/** Typed emit: only events declared in ClientToServerEvents, with their exact payloads. */
type Emit = <E extends keyof ClientToServerEvents>(
  event: E,
  ...args: Parameters<ClientToServerEvents[E]>
) => void;

interface UseSocketValue extends SocketContextValue {
  emit: Emit;
}

/**
 * Consume SocketContext. Throws if used outside a SocketProvider (Rule 10).
 * Exposes a typed `emit` helper so components never touch `socket.emit`
 * directly and can only emit events listed in `frontend-overview.md` (Rule 8).
 */
export function useSocket(): UseSocketValue {
  const ctx = useContext(SocketContext);
  if (ctx === null) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  const { socket } = ctx;

  const emit = useCallback<Emit>(
    (event, ...args) => {
      // socket is typed as AppSocket, so this call is fully checked.
      socket.emit(event, ...args);
    },
    [socket],
  );

  return { ...ctx, emit };
}
