export type TRoomType = "direct" | "group"

export interface User {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}
export interface Room {
  _id: string;
  name: string;
  type: TRoomType;
  members: User[];
  createdBy: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  roomId: string;
  sender: User;
  content: string;
  type: "text" | "image";
  readBy: string[];
  createdAt: string;
}

export interface Notification {
  type: string;
  roomId: string;
  messageId: string;
  sender: string; // sender's userId — backend sends only the ID, not a populated User
  preview: string;
  createdAt: string;
}
