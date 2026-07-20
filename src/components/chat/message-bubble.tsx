"use client";

import { useState } from "react";
import { useChat } from "./chat-provider";
import { type ChatMessage } from "./mock-data";
import { Avatar } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Pin,
  Link2,
  Copy,
  Check,
  SmilePlus,
  FileText,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatMessageDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\[([^\]]+)\]\(([^)]+)\)|:[\w]+:)/g);
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3);
      elements.push(
        <pre key={key++} className="my-2 rounded-xl bg-gray-900 p-4 overflow-x-auto">
          <code className="text-xs text-gray-100 font-mono leading-relaxed">{code}</code>
        </pre>
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      elements.push(
        <code key={key++} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-pink-600">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("[") && parts[i + 2]) {
      const linkText = parts[i + 1];
      const linkUrl = parts[i + 2];
      elements.push(
        <a key={key++} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] hover:underline font-medium">
          {linkText}
        </a>
      );
      i += 3;
    } else if (part.startsWith(":") && part.endsWith(":")) {
      elements.push(<span key={key++}>{part}</span>);
    } else {
      const lines = part.split("\n");
      lines.forEach((line, li) => {
        if (line.startsWith("## ")) {
          elements.push(<h3 key={key++} className="text-base font-bold text-gray-900 mt-2 mb-1">{line.slice(3)}</h3>);
        } else if (line.startsWith("**") && line.endsWith("**")) {
          elements.push(<strong key={key++} className="font-semibold">{line.slice(2, -2)}</strong>);
        } else if (line.startsWith("- ")) {
          elements.push(<li key={key++} className="text-sm text-gray-700 ml-4 list-disc">{line.slice(2)}</li>);
        } else {
          if (li > 0) elements.push(<br key={key++} />);
          if (line.trim()) elements.push(<span key={key++}>{line}</span>);
        }
      });
    }
  }

  return <div className="text-sm text-gray-800 leading-relaxed">{elements}</div>;
}

const quickEmojis = ["👍", "🎉", "🔥", "❤️", "🚀", "😂", "😢", "😡"];

export function MessageBubble({
  message,
  isLast,
}: {
  message: ChatMessage;
  isLast: boolean;
}) {
  const { currentUserId, addReaction, editMessage, deleteMessage, pinMessage, getMember } = useChat();
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showEmoji, setShowEmoji] = useState(false);

  const author = getMember(message.authorId);
  const isOwn = message.authorId === currentUserId;
  const isReply = !!message.replyTo;

  function handleSaveEdit() {
    if (editText.trim() && editText !== message.content) {
      editMessage(message.id, message.channelId, editText.trim());
    }
    setEditing(false);
  }

  const roleColors: Record<string, string> = {
    owner: "text-amber-400",
    admin: "text-red-400",
    moderator: "text-[#3B82F6]",
    developer: "text-green-400",
    employee: "text-gray-400",
  };
  const roleLabels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    moderator: "Mod",
    developer: "Dev",
    employee: "Member",
  };

  return (
    <div
      className={`group relative flex gap-3 px-5 py-1.5 transition-colors hover:bg-gray-50/80 ${
        message.isPinned ? "border-l-2 border-[#3B82F6] bg-blue-50/30" : ""
      }`}
    >
      <div className="shrink-0 pt-0.5">
        <Avatar name={author?.name || "Unknown"} size="sm" className="h-8 w-8" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 hover:text-[#3B82F6] cursor-pointer">
            {author?.name || "Unknown"}
          </span>
          {author && (
            <span className={`text-[10px] font-medium ${roleColors[author.role] || "text-gray-400"}`}>
              {roleLabels[author.role] || author.role}
            </span>
          )}
          <span className="text-[11px] text-gray-400">{formatMessageTime(message.createdAt)}</span>
          {message.editedAt && <span className="text-[10px] text-gray-400">(edited)</span>}
          {message.isPinned && <Pin className="h-3 w-3 text-[#3B82F6]" strokeWidth={2} />}
        </div>

        {isReply && (
          <div className="flex items-center gap-1.5 mt-0.5 mb-0.5 text-xs text-gray-400">
            <Reply className="h-3 w-3" strokeWidth={1.5} />
            <span>Replying to a message</span>
          </div>
        )}

        {editing ? (
          <div className="mt-1 flex gap-2">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === "Escape") { setEditing(false); setEditText(message.content); } }}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              autoFocus
            />
            <button onClick={handleSaveEdit} className="rounded-lg bg-[#3B82F6] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors">Save</button>
            <button onClick={() => { setEditing(false); setEditText(message.content); }} className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          </div>
        ) : (
          <div className="mt-0.5" onClick={() => isOwn && setEditing(true)}>
            {renderContent(message.content)}
          </div>
        )}

        {message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <div key={att.id} className="group/att relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {att.type === "image" ? (
                  <div className="h-32 w-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
                    <span className="ml-2 text-xs text-gray-500">{att.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">{att.name}</p>
                      {att.size && <p className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <Download className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => addReaction(message.id, message.channelId, r.emoji, currentUserId)}
                className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-xs transition-all ${
                  r.userIds.includes(currentUserId)
                    ? "border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.userIds.length}</span>
              </button>
            ))}
            <div className="relative">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
              >
                <SmilePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute bottom-full left-0 mb-1 z-50 flex gap-0.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                  >
                    {quickEmojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => { addReaction(message.id, message.channelId, e, currentUserId); setShowEmoji(false); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-sm hover:bg-gray-100 transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <div className="absolute right-3 top-1 hidden group-hover:flex items-center gap-0.5">
        <button onClick={() => addReaction(message.id, message.channelId, "👍", currentUserId)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 shadow-sm transition-all" title="React">
          <SmilePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 shadow-sm transition-all" title="More">
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                onClick={() => setShowMenu(false)}
              >
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                  <Reply className="h-3.5 w-3.5" /> Reply
                </button>
                <button onClick={() => { pinMessage(message.id, message.channelId); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                  <Pin className="h-3.5 w-3.5" /> {message.isPinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={async () => { await navigator.clipboard.writeText(message.content); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                  <Copy className="h-3.5 w-3.5" /> Copy Link
                </button>
                <div className="my-1 border-t border-gray-100" />
                {isOwn && (
                  <button onClick={() => { setEditing(true); setEditText(message.content); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {isOwn && (
                  <button onClick={() => { deleteMessage(message.id, message.channelId); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
