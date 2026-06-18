import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  /** Accessible label announced to screen readers (defaults to "Loading"). */
  label?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

export default function Loader({
  size = "md",
  label = "Loading",
  className,
}: LoaderProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex h-full w-full items-center justify-center", className)}
    >
      <Loader2Icon className={cn("text-muted-foreground animate-spin", SIZE_CLASSES[size])} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
