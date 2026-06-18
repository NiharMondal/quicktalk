import {
  Avatar as AvatarRoot,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarProps {
  /** Display name used for the alt text and initials fallback. */
  name: string;
  /** Optional avatar image URL; falls back to initials when absent or it fails to load. */
  src?: string;
  size?: "sm" | "md" | "lg";
  /** When provided, renders a presence dot (green = online, muted = offline). */
  isOnline?: boolean;
  className?: string;
}

/** shadcn Avatar's size scale uses "default" for the medium size. */
const SHADCN_SIZE: Record<NonNullable<AvatarProps["size"]>, "sm" | "default" | "lg"> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = "md",
  isOnline,
  className,
}: AvatarProps): React.ReactElement {
  return (
    <AvatarRoot size={SHADCN_SIZE[size]} className={className}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
      {isOnline !== undefined ? (
        <AvatarBadge
          className={cn(isOnline ? "bg-emerald-500" : "bg-muted-foreground")}
          title={isOnline ? "Online" : "Offline"}
        />
      ) : null}
    </AvatarRoot>
  );
}
