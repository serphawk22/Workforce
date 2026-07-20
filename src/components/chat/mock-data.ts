export type MemberRole = "owner" | "admin" | "moderator" | "developer" | "employee";

export type ChatMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: MemberRole;
  status: "online" | "away" | "offline";
  lastSeen: string;
};

export type ChannelCategory = {
  id: string;
  name: string;
  channels: string[];
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isFavorited: boolean;
  createdAt: string;
  createdBy: string;
  members: string[];
  pinnedMessages: string[];
};

export type MessageAttachment = {
  id: string;
  type: "image" | "file" | "pdf" | "gif";
  url: string;
  name: string;
  size?: number;
};

export type MessageReaction = {
  emoji: string;
  userIds: string[];
};

export type ChatMessage = {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  replyTo: string | null;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  isPinned: boolean;
};
