"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/store/chatStore";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import Avatar from "@/components/shared/Avatar";
import Loader from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  roomId: string;
}

/** Distance (px) from the bottom within which we treat the user as "at bottom". */
const NEAR_BOTTOM_PX = 80;
/** Scroll distance (px) from the top that triggers loading older messages. */
const NEAR_TOP_PX = 80;

export default function ChatWindow({ roomId }: ChatWindowProps): React.ReactElement {
  const { messages, isLoading, error, loadMore, hasMore, refetch } = useMessages(roomId);
  const { user } = useAuth();
  const { emit } = useSocket();
  const rooms = useChatStore((s) => s.rooms);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const firstIdRef = useRef<string | undefined>(undefined);
  const lastIdRef = useRef<string | undefined>(undefined);
  const lenRef = useRef(0);
  const renderedRoomRef = useRef(roomId);

  // Join the room for real-time delivery; mark it read on entry; leave on exit.
  useEffect(() => {
    setActiveRoomId(roomId);
    emit("join_room", { roomId });
    emit("mark_read", { roomId });
    clearUnread(roomId);
    return () => {
      emit("leave_room", { roomId });
    };
  }, [roomId, emit, clearUnread, setActiveRoomId]);

  // Manage scroll position across the three message-list transitions.
  useLayoutEffect(() => {
    const el = scrollRef.current;

    // Reset scroll bookkeeping when the room changes (refs only mutate in effects).
    if (renderedRoomRef.current !== roomId) {
      renderedRoomRef.current = roomId;
      isAtBottomRef.current = true;
      firstIdRef.current = undefined;
      lastIdRef.current = undefined;
      lenRef.current = 0;
    }

    if (!el) return;
    const first = messages[0]?._id;
    const last = messages[messages.length - 1]?._id;

    if (lenRef.current === 0 && messages.length > 0) {
      // Initial load for this room → jump to the newest message.
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > lenRef.current && first !== firstIdRef.current && last === lastIdRef.current) {
      // Older messages prepended → keep the viewport anchored where it was.
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
    } else if (last !== lastIdRef.current && isAtBottomRef.current) {
      // New message at the bottom and the user is already there → follow it.
      el.scrollTop = el.scrollHeight;
    }

    firstIdRef.current = first;
    lastIdRef.current = last;
    lenRef.current = messages.length;
  }, [messages, roomId]);

  function handleScroll(): void {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;

    if (el.scrollTop < NEAR_TOP_PX && hasMore && !loadingMoreRef.current) {
      loadingMoreRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      void loadMore().finally(() => {
        loadingMoreRef.current = false;
      });
    }
  }

  const room = rooms.find((r) => r._id === roomId);
  const other = room?.type === "direct" ? room.members.find((m) => m._id !== user?._id) : undefined;
  const title = other?.username ?? room?.name ?? "Conversation";

  const roomType = room?.type;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b p-3">
        <Avatar name={title} src={other?.avatarUrl} size="md" />
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        {room?.type === "group" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0"
                aria-label="Copy invite link"
                onClick={() => {
                  void navigator.clipboard.writeText(roomId).then(() => {
                    toast.success("Invite link copied!");
                  });
                }}
              >
                <CopyIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy invite link</TooltipContent>
          </Tooltip>
        )}
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <Loader className="h-full" label="Loading messages" />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-sm">
            No messages yet. Say hi!
          </p>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {hasMore ? (
              <div className="flex justify-center py-1">
                <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
              </div>
            ) : null}
            {messages.map((message) => (
              <MessageBubble key={message._id} message={message} isOwn={message.sender._id === user?._id} roomType={roomType} />
            ))}
          </div>
        )}
      </div>

      <TypingIndicator roomId={roomId} />
      <MessageInput roomId={roomId} />
    </div>
  );
}
