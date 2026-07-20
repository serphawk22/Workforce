"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  type Channel,
  type ChatMessage,
  type ChatMember,
  type ChannelCategory,
} from "./mock-data";
import {
  getChannels as fetchChannels,
  getMessages as fetchMessages,
  sendMessage as apiSendMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  togglePinMessage as apiTogglePin,
  addReaction as apiAddReaction,
  createChannel as apiCreateChannel,
  addChannelMember as apiAddChannelMember,
  getWorkspaceMembers,
} from "@/actions/chat";

type ChatContextValue = {
  channels: Record<string, Channel>;
  currentChannelId: string;
  messages: Record<string, ChatMessage[]>;
  members: ChatMember[];
  categories: ChannelCategory[];
  currentUserId: string;
  currentUserName: string;
  showRightPanel: boolean;
  setCurrentChannel: (id: string) => void;
  addMessage: (channelId: string, content: string) => Promise<void>;
  editMessage: (msgId: string, channelId: string, content: string) => Promise<void>;
  deleteMessage: (msgId: string, channelId: string) => Promise<void>;
  addReaction: (msgId: string, channelId: string, emoji: string, userId: string) => Promise<void>;
  pinMessage: (msgId: string, channelId: string) => Promise<void>;
  addChannel: (name: string, description: string, category: string, isPrivate: boolean) => Promise<void>;
  toggleRightPanel: () => void;
  typingUsers: Record<string, string[]>;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  activeChannel: Channel | null;
  unreadCounts: Record<string, number>;
  markAsRead: (channelId: string) => void;
  toggleMuteChannel: (channelId: string) => void;
  toggleFavoriteChannel: (channelId: string) => void;
  getMember: (id: string) => ChatMember | undefined;
  addMemberToChannel: (channelId: string, memberId: string) => Promise<void>;
  workspaceMembers: ChatMember[];
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({
  children,
  userId,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userId: string;
  userName: string;
  userEmail: string;
}) {
  const [channels, setChannels] = useState<Record<string, Channel>>({});
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [currentChannelId, setCurrentChannelId] = useState("");
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<ChatMember[]>([]);

  useEffect(() => {
    if (!userId) return;
    const initialId = localStorage.getItem("taskflow-chat-channel");
    (async () => {
      const [chs, wsMembers] = await Promise.all([fetchChannels(), getWorkspaceMembers()]);
      setMembers(wsMembers);
      setWorkspaceMembers(wsMembers);
      const chMap: Record<string, Channel> = {};
      for (const ch of chs) {
        chMap[ch.id] = ch as Channel;
      }
      setChannels(chMap);
      if (initialId && chMap[initialId]) {
        setCurrentChannelId(initialId);
      } else if (chs.length > 0) {
        setCurrentChannelId(chs[0].id);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (currentChannelId) {
      localStorage.setItem("taskflow-chat-channel", currentChannelId);
      (async () => {
        const msgs = await fetchMessages(currentChannelId);
        setMessages((prev) => ({ ...prev, [currentChannelId]: msgs as ChatMessage[] }));
      })();
    }
  }, [currentChannelId]);

  const getMember = useCallback((id: string): ChatMember | undefined => {
    return members.find((m) => m.id === id);
  }, [members]);

  const setCurrentChannel = useCallback((id: string) => {
    setCurrentChannelId(id);
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
  }, []);

  const addMessage = useCallback(async (channelId: string, content: string) => {
    const msg = await apiSendMessage(channelId, content);
    setMessages((prev) => ({
      ...prev,
      [channelId]: [...(prev[channelId] || []), msg as ChatMessage],
    }));
  }, []);

  const editMessage = useCallback(async (msgId: string, channelId: string, content: string) => {
    await apiEditMessage(msgId, content);
    setMessages((prev) => ({
      ...prev,
      [channelId]: (prev[channelId] || []).map((m) =>
        m.id === msgId ? { ...m, content, editedAt: new Date().toISOString() } : m
      ),
    }));
  }, []);

  const deleteMessage = useCallback(async (msgId: string, channelId: string) => {
    await apiDeleteMessage(msgId);
    setMessages((prev) => ({
      ...prev,
      [channelId]: (prev[channelId] || []).filter((m) => m.id !== msgId),
    }));
  }, []);

  const addReaction = useCallback(async (msgId: string, channelId: string, emoji: string, userId: string) => {
    await apiAddReaction(msgId, emoji);
    setMessages((prev) => ({
      ...prev,
      [channelId]: (prev[channelId] || []).map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          const has = existing.userIds.includes(userId);
          return {
            ...m,
            reactions: m.reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, userIds: has ? r.userIds.filter((u) => u !== userId) : [...r.userIds, userId] }
                : r
            ).filter((r) => r.userIds.length > 0),
          };
        }
        return { ...m, reactions: [...m.reactions, { emoji, userIds: [userId] }] };
      }),
    }));
  }, []);

  const pinMessage = useCallback(async (msgId: string, channelId: string) => {
    const msg = messages[channelId]?.find((m) => m.id === msgId);
    await apiTogglePin(msgId, msg?.isPinned || false);
    setMessages((prev) => ({
      ...prev,
      [channelId]: (prev[channelId] || []).map((m) =>
        m.id === msgId ? { ...m, isPinned: !m.isPinned } : m
      ),
    }));
  }, [messages]);

  const addMemberToChannel = useCallback(async (channelId: string, memberId: string) => {
    await apiAddChannelMember(channelId, memberId);
    setChannels((prev) => {
      const ch = prev[channelId];
      if (!ch || ch.members.includes(memberId)) return prev;
      return { ...prev, [channelId]: { ...ch, members: [...ch.members, memberId] } };
    });
  }, []);

  const addChannel = useCallback(async (name: string, description: string, category: string, isPrivate: boolean) => {
    const ch = await apiCreateChannel(name, description, category, isPrivate);
    setChannels((prev) => ({ ...prev, [ch.id]: ch as Channel }));
    setCurrentChannelId(ch.id);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setShowRightPanel((prev) => !prev);
  }, []);

  const setTyping = useCallback((channelId: string, userId: string, isTyping: boolean) => {
    setTypingUsers((prev) => {
      const current = prev[channelId] || [];
      if (isTyping) {
        if (current.includes(userId)) return prev;
        return { ...prev, [channelId]: [...current, userId] };
      }
      return { ...prev, [channelId]: current.filter((u) => u !== userId) };
    });
  }, []);

  const markAsRead = useCallback((channelId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
  }, []);

  const toggleMuteChannel = useCallback((channelId: string) => {
    setChannels((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], isMuted: !prev[channelId].isMuted },
    }));
  }, []);

  const toggleFavoriteChannel = useCallback((channelId: string) => {
    setChannels((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], isFavorited: !prev[channelId].isFavorited },
    }));
  }, []);

  const activeChannel = useMemo(() => channels[currentChannelId] || null, [channels, currentChannelId]);

  return (
    <ChatContext.Provider
      value={{
        channels,
        currentChannelId,
        messages,
        members,
        categories: [],
        currentUserId: userId,
        currentUserName: userName,
        showRightPanel,
        setCurrentChannel,
        addMessage,
        editMessage,
        deleteMessage,
        addReaction,
        pinMessage,
        addChannel,
        toggleRightPanel,
        typingUsers,
        setTyping,
        activeChannel,
        unreadCounts,
        markAsRead,
        toggleMuteChannel,
        toggleFavoriteChannel,
        getMember,
        addMemberToChannel,
        workspaceMembers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
