"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  roomId: string;
}

/** Idle time after the last keystroke before we emit typing_stop. */
const TYPING_DEBOUNCE_MS = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 mb

function getUploadErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
      return data.message;
    }
    return err.message;
  }
  return "Failed to upload image";
}

export default function MessageInput({ roomId }: MessageInputProps): React.ReactElement {
  const { emit } = useSocket();
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [trackedRoomId, setTrackedRoomId] = useState(roomId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the draft when switching rooms (render-phase reset).
  if (roomId !== trackedRoomId) {
    setTrackedRoomId(roomId);
    setText("");
  }

  function stopTyping(): void {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emit("typing_stop", { roomId });
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setText(event.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit("typing_start", { roomId });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS);
  }

  function sendText(): void {
    const content = text.trim();
    if (!content) return;
    emit("send_message", { roomId, content, type: "text" });
    setText("");
    stopTyping();
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    sendText();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendText();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so the same file can be re-selected
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // axios sets the multipart/form-data boundary automatically for FormData.
      const { data } = await api.post<{ url: string }>("/upload", formData);
      emit("send_message", { roomId, content: data.url, type: "image" });
    } catch (err) {
      toast.error(getUploadErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  // Stop typing when leaving the room or unmounting so the indicator clears.
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emit("typing_stop", { roomId });
      }
    };
  }, [roomId, emit]);

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Attach image"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </Button>

      <Textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={1}
        className="max-h-32 min-h-10 flex-1 resize-none"
      />

      <Button type="submit" size="icon" aria-label="Send message" disabled={text.trim().length === 0}>
        <SendIcon className="size-4" />
      </Button>
    </form>
  );
}
