"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useRooms";
import Sidebar from "@/components/sidebar/Sidebar";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";

export default function RootPage(): React.ReactElement {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
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

  // Authenticated, rooms loaded, but the user has no conversations yet.
  if (!authLoading && user && !roomsLoading && !error && rooms.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <p className="text-muted-foreground text-sm">No conversations yet.</p>
        </main>
      </div>
    );
  }

  // Failed to load rooms — show sidebar so layout stays consistent.
  if (!authLoading && user && error) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </main>
      </div>
    );
  }

  // Hydrating auth, loading rooms, or mid-redirect.
  return <Loader size="lg" className="min-h-screen" label="Loading" />;
}
