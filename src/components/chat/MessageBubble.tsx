import Avatar from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";
import type { Message, TRoomType } from "@/types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  roomType: TRoomType | undefined;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isOwn, roomType }: MessageBubbleProps): React.ReactElement {
  return (
    <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
      {!isOwn ? (
        <Avatar name={message.sender.username} src={message.sender.avatarUrl} size="sm" />
      ) : null}

      <div className={cn("flex max-w-[75%] flex-col gap-1", isOwn ? "items-end" : "items-start")}>
        {!isOwn && roomType==="group" ? (
          <span className="text-muted-foreground px-1 text-xs font-medium">
            {message.sender.username}
          </span>
        ) : null}

        <div
          className={cn(
            "rounded-2xl px-3 py-2",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm",
            message.type === "image" && "overflow-hidden p-1",
          )}
        >
          {message.type === "image" ? (
            // Chat images are remote Cloudinary URLs of unknown dimensions; next/image
            // is unsuitable here and the overview (Rule 13) mandates a plain <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.content}
              alt="Shared image"
              className="max-h-80 max-w-full rounded-xl object-cover"
            />
          ) : (
            <p className="text-sm wrap-break-word whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        <span className="text-muted-foreground px-1 text-[10px]">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
