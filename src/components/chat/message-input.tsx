"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "./chat-provider";
import {
  SmilePlus,
  Paperclip,
  Send,
  Loader2,
} from "lucide-react";

const quickEmojis = ["👍", "🎉", "🔥", "❤️", "🚀", "😂", "😢", "😡", "💯", "👀"];

export function MessageInput() {
  const { activeChannel, addMessage, currentChannelId, currentUserId, setTyping } = useChat();
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentChannelId]);

  function handleChange(value: string) {
    setText(value);
    setTyping(currentChannelId, currentUserId, value.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(currentChannelId, currentUserId, false);
    }, 2000);
  }

  async function handleSend() {
    if (!text.trim() || !activeChannel || sending) return;
    setSending(true);
    try {
      await addMessage(currentChannelId, text.trim());
      setText("");
      setTyping(currentChannelId, currentUserId, false);
      if (inputRef.current) inputRef.current.focus();
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function addEmoji(emoji: string) {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    if (inputRef.current) inputRef.current.focus();
  }

  if (!activeChannel) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4">
      {showEmoji && (
        <div className="mb-2 flex gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {quickEmojis.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-gray-100 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm transition-all focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/10">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Emoji"
        >
          <SmilePlus className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Attachment"
        >
          <Paperclip className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${activeChannel.name}`}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] text-white transition-all hover:bg-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
