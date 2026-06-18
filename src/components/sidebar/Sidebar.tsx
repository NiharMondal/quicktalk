"use client";

import { LogOutIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import RoomList from "@/components/sidebar/RoomList";
import UserList from "@/components/sidebar/UserList";
import NewRoomDialog from "@/components/sidebar/NewRoomDialog";
import JoinRoomDialog from "@/components/sidebar/JoinRoomDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function Sidebar(): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <aside className="bg-card flex h-full w-72 flex-col border-r">
      <header className="flex items-center gap-3 p-4">
        {user ? <Avatar name={user.username} src={user.avatarUrl} size="md" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.username ?? "…"}</p>
          {user?.email ? <p className="text-muted-foreground truncate text-xs">{user.email}</p> : null}
        </div>
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => void logout()}>
          <LogOutIcon className="size-4" />
        </Button>
      </header>

      <Separator />

      <ScrollArea className="flex-1">
        <nav className="py-3">
          <div className="flex items-center px-4 pb-2">
            <h2 className="text-muted-foreground flex-1 text-xs font-semibold tracking-wide uppercase">
              Rooms
            </h2>
            <div className="flex items-center gap-1">
              <JoinRoomDialog />
              <NewRoomDialog />
            </div>
          </div>
          <RoomList />

          <Separator className="my-3" />

          <h2 className="text-muted-foreground px-4 pb-2 text-xs font-semibold tracking-wide uppercase">
            Online
          </h2>
          <UserList />
        </nav>
      </ScrollArea>
    </aside>
  );
}
