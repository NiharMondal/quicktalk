"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Room } from "@/types";

export default function JoinRoomDialog(): React.ReactElement {
  const router = useRouter();
  const upsertRoom = useChatStore((s) => s.upsertRoom);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);

  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleOpenChange(value: boolean): void {
    setOpen(value);
    if (!value) setRoomId("");
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const id = roomId.trim();
    if (!id) return;
    setIsLoading(true);
    try {
      const { data } = await api.post<Room>(`/rooms/${id}/join`);
      upsertRoom(data);
      setActiveRoomId(data._id);
      router.replace(`/${data._id}`);
      handleOpenChange(false);
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : "Failed to join room";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Join a room">
          <CirclePlus className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a room</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="join-room-id">Room ID</Label>
            <Input
              id="join-room-id"
              placeholder="Paste the room ID here"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              autoFocus
              required
            />
            <p className="text-muted-foreground text-xs">
              Ask a room member to share the invite link — the ID is the last part of the URL.
            </p>
          </div>
          <Button type="submit" disabled={isLoading || !roomId.trim()}>
            {isLoading ? "Joining…" : "Join room"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
