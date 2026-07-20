"use client";

import { useState } from "react";
import { useChat } from "./chat-provider";
import { type Channel } from "./mock-data";
import {
  Hash,
  Lock,
  BellOff,
  Star,
  MoreHorizontal,
  Edit3,
  Trash2,
  VolumeX,
  Pin,
  Archive,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChannelItem({ channel }: { channel: Channel }) {
  const { currentChannelId, setCurrentChannel, unreadCounts, markAsRead, toggleMuteChannel, toggleFavoriteChannel } = useChat();
  const [showMenu, setShowMenu] = useState(false);
  const active = currentChannelId === channel.id;
  const unread = (unreadCounts[channel.id] || 0) > 0;

  return (
    <div className="relative group">
      <button
        onClick={() => { setCurrentChannel(channel.id); markAsRead(channel.id); }}
        className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-all ${
          active
            ? "bg-[#3B82F6]/10 text-white font-medium"
            : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
        }`}
      >
        <span className="flex items-center justify-center w-5 h-5 shrink-0">
          {channel.isPrivate ? (
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <Hash className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </span>
        <span className="truncate flex-1 text-left">{channel.name}</span>
        {channel.isMuted && <BellOff className="h-3 w-3 text-gray-600 shrink-0" strokeWidth={1.5} />}
        {unread && (
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#3B82F6]" />
        )}
      </button>

      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavoriteChannel(channel.id); }}
          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
            channel.isFavorited ? "text-amber-400 hover:bg-gray-700" : "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
          }`}
        >
          <Star className="h-3.5 w-3.5" strokeWidth={channel.isFavorited ? 2.5 : 1.5} fill={channel.isFavorited ? "currentColor" : "none"} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/30"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
                  <Pin className="h-3.5 w-3.5" /> Pin Channel
                </button>
                <button onClick={() => { toggleMuteChannel(channel.id); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
                  <VolumeX className="h-3.5 w-3.5" /> {channel.isMuted ? "Unmute" : "Mute"}
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
                <div className="my-1 border-t border-gray-800" />
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" /> Rename
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-800 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
