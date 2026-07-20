"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useChat } from "./chat-provider";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { InviteModal } from "./invite-modal";
import {
  Hash,
  Lock,
  Pin,
  Users,
  Search,
  Info,
  Bookmark,
  MessageSquare,
} from "lucide-react";

function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function groupMessagesByDate<T extends { createdAt: string }>(messages: T[]) {
  const groups: { date: string; messages: T[] }[] = [];
  let currentDate = "";
  let currentGroup: typeof messages = [];

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup });
      }
      currentDate = msgDate;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }
  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup });
  }
  return groups;
}

export function ChatArea() {
  const { activeChannel, messages, currentChannelId, typingUsers, toggleRightPanel, showRightPanel, getMember } = useChat();
  const [showInvite, setShowInvite] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelMessages = messages[currentChannelId] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChannelId, channelMessages.length]);

  const groupedMessages = useMemo(() => groupMessagesByDate(channelMessages), [channelMessages]);
  const typingHere = typingUsers[currentChannelId] || [];
  const pinnedCount = channelMessages.filter((m) => m.isPinned).length;

  if (!activeChannel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" strokeWidth={1} />
          <p className="mt-3 text-sm text-gray-400">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F8FAFC] min-w-0">
      <div className="flex items-center justify-between px-5 h-14 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] shrink-0">
            {activeChannel.isPrivate ? <Lock className="h-3.5 w-3.5" strokeWidth={2} /> : <Hash className="h-3.5 w-3.5" strokeWidth={2} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{activeChannel.name}</h2>
            <p className="text-[11px] text-gray-400 truncate">{activeChannel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeChannel?.isPrivate && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Add People"
            >
              <Users className="h-4 w-4" strokeWidth={1.5} /> Add People
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search"
              className="w-40 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>
          {pinnedCount > 0 && (
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative" title={`${pinnedCount} pinned`}>
              <Pin className="h-4 w-4" strokeWidth={1.5} />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3B82F6] text-[8px] font-bold text-white">
                {pinnedCount}
              </span>
            </button>
          )}
          <button
            onClick={toggleRightPanel}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              showRightPanel ? "bg-[#3B82F6]/10 text-[#3B82F6]" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
            title="Channel Info"
          >
            <Info className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {channelMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/10">
              <Hash className="h-6 w-6 text-[#3B82F6]" strokeWidth={1.5} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Welcome to #{activeChannel.name}
            </h3>
            <p className="mt-1 text-sm text-gray-400 max-w-md text-center">
              {activeChannel.description}
            </p>
            <p className="mt-4 text-xs text-gray-400">
              This is the start of the #{activeChannel.name} channel.
            </p>
          </div>
        ) : (
          <div className="py-2">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-[11px] font-medium text-gray-400 shrink-0">
                    {formatDateDivider(group.messages[0].createdAt)}
                  </span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                {group.messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLast={idx === group.messages.length - 1}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {typingHere.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-1.5 text-xs text-gray-400">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
            </span>
            {typingHere.map((uid) => getMember(uid)?.name).filter(Boolean).join(", ")} typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput />
      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}
