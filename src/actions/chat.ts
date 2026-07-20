"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function getChannels() {
  const session = await requireAuth();
  const channels = await prisma.chatChannel.findMany({
    include: { members: true },
    orderBy: { createdAt: "asc" },
  });
  return channels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    description: ch.description,
    category: ch.category,
    isPrivate: ch.isPrivate,
    isArchived: false,
    isMuted: false,
    isFavorited: false,
    createdAt: ch.createdAt.toISOString(),
    createdBy: ch.createdById,
    members: ch.members.map((m) => m.userId),
    pinnedMessages: [] as string[],
  }));
}

export async function createChannel(
  name: string,
  description: string,
  category: string,
  isPrivate: boolean
) {
  const session = await requireAuth();
  const channel = await prisma.chatChannel.create({
    data: {
      name,
      description,
      category: category || "General",
      isPrivate,
      createdById: session.user.id,
      members: {
        create: { userId: session.user.id },
      },
    },
  });
  revalidatePath("/chat");
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    category: channel.category,
    isPrivate: channel.isPrivate,
    isArchived: false,
    isMuted: false,
    isFavorited: false,
    createdAt: channel.createdAt.toISOString(),
    createdBy: channel.createdById,
    members: [session.user.id],
    pinnedMessages: [] as string[],
  };
}

export async function addChannelMember(channelId: string, memberId: string) {
  const session = await requireAuth();
  await prisma.chatChannelMember.create({
    data: { channelId, userId: memberId },
  });
  revalidatePath("/chat");
}

export async function getMessages(channelId: string) {
  const session = await requireAuth();
  const messages = await prisma.chatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
  });
  return messages.map((m) => ({
    id: m.id,
    channelId: m.channelId,
    authorId: m.authorId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() || null,
    replyTo: m.replyTo,
    attachments: [] as { id: string; type: string; url: string; name: string; size?: number }[],
    reactions: JSON.parse(m.reactions || "[]"),
    isPinned: m.isPinned,
  }));
}

export async function sendMessage(channelId: string, content: string) {
  const session = await requireAuth();
  const message = await prisma.chatMessage.create({
    data: {
      channelId,
      authorId: session.user.id,
      content,
    },
  });
  return {
    id: message.id,
    channelId: message.channelId,
    authorId: message.authorId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    editedAt: null,
    replyTo: null,
    attachments: [],
    reactions: [],
    isPinned: false,
  };
}

export async function editMessage(messageId: string, content: string) {
  const session = await requireAuth();
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message || message.authorId !== session.user.id) throw new Error("Not authorized");
  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
  });
  revalidatePath("/chat");
  return { ...updated, createdAt: updated.createdAt.toISOString(), editedAt: updated.editedAt?.toISOString() || null };
}

export async function deleteMessage(messageId: string) {
  const session = await requireAuth();
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message || message.authorId !== session.user.id) throw new Error("Not authorized");
  await prisma.chatMessage.delete({ where: { id: messageId } });
  revalidatePath("/chat");
}

export async function togglePinMessage(messageId: string, isPinned: boolean) {
  const session = await requireAuth();
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { isPinned: !isPinned },
  });
  revalidatePath("/chat");
}

export async function addReaction(messageId: string, emoji: string) {
  const session = await requireAuth();
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found");
  const reactions = JSON.parse(message.reactions || "[]");
  const existing = reactions.find((r: { emoji: string }) => r.emoji === emoji);
  if (existing) {
    const has = existing.userIds.includes(session.user.id);
    existing.userIds = has
      ? existing.userIds.filter((u: string) => u !== session.user.id)
      : [...existing.userIds, session.user.id];
    if (existing.userIds.length === 0) {
      const idx = reactions.indexOf(existing);
      reactions.splice(idx, 1);
    }
  } else {
    reactions.push({ emoji, userIds: [session.user.id] });
  }
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(reactions) },
  });
}

export async function getChannelMembers(channelId: string) {
  const session = await requireAuth();
  const members = await prisma.chatChannelMember.findMany({
    where: { channelId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: null,
    role: "employee" as const,
    status: "online" as const,
    lastSeen: new Date().toISOString(),
  }));
}

export async function getWorkspaceMembers() {
  const session = await requireAuth();
  const myWorkspaces = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = myWorkspaces.map((w) => w.workspaceId);
  if (workspaceIds.length === 0) return [];
  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId: { in: workspaceIds } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const seen = new Set<string>();
  return memberships
    .filter((m) => {
      if (seen.has(m.user.id)) return false;
      seen.add(m.user.id);
      return true;
    })
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: null,
      role: "employee" as const,
      status: "online" as const,
      lastSeen: new Date().toISOString(),
    }));
}
