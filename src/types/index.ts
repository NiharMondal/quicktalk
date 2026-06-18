// Shared domain types — mirror the backend data models exactly.
// No extra fields, no renamed properties. Backend owns these contracts.

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
  type: "direct" | "group";
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
  sender: User;
  preview: string;
  createdAt: string;
}
