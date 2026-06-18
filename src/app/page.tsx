"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useRooms";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";

export default function RootPage(): React.ReactElement {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { rooms, isLoading: roomsLoading, error, refetch } = useRooms();

  // Once auth resolves: anonymous → /login; authenticated → first room.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roomsLoading && !error && rooms.length > 0) {
      router.replace(`/${rooms[0]._id}`);
    }
  }, [authLoading, user, roomsLoading, error, rooms, router]);

  // Authenticated, rooms loaded, but the user has no conversations.
  if (!authLoading && user && !roomsLoading && !error && rooms.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-muted-foreground text-sm">You have no conversations yet.</p>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Log out
        </Button>
      </main>
    );
  }

  // Failed to load rooms.
  if (!authLoading && user && error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          Retry
        </Button>
      </main>
    );
  }

  // Hydrating auth, loading rooms, or mid-redirect.
  return <Loader size="lg" className="min-h-screen" label="Loading" />;
}
