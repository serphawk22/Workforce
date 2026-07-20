"use client";

import { useState, useMemo } from "react";
import { useChat } from "./chat-provider";
import { ChannelItem } from "./channel-item";
import { CreateChannelModal } from "./create-channel-modal";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Users,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChannelSidebar() {
  const { channels, categories, members, currentChannelId, setCurrentChannel } = useChat();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const toggleCat = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredChannels = useMemo(() => {
    const all = Object.values(channels);
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((ch) => ch.name.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q));
  }, [channels, search]);

  const onlineCount = members.filter((m) => m.status === "online").length;

  return (
    <>
      <div className="flex h-full w-[260px] flex-col bg-[#1E2530] shrink-0 border-r border-gray-800/50">
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800/50 shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white">Channels</h1>
            <p className="text-[10px] text-gray-500">{members.length} members{onlineCount > 0 && `, ${onlineCount} online`}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreate(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              title="Create Channel"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full rounded-lg bg-gray-800 py-1.5 pl-8 pr-3 text-xs text-gray-300 placeholder-gray-500 border border-gray-700/50 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
          {Object.keys(channels).length === 0 && !search.trim() ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <Hash className="h-8 w-8 text-gray-600 mb-2" strokeWidth={1} />
              <p className="text-sm text-gray-500 font-medium">No channels yet</p>
              <p className="text-xs text-gray-600 mt-1">Create a channel to get started</p>
            </div>
          ) : search.trim() ? (
            <div className="space-y-0.5 pt-1">
              {filteredChannels.map((ch) => (
                <ChannelItem key={ch.id} channel={ch} />
              ))}
              {filteredChannels.length === 0 && (
                <p className="px-3 py-4 text-xs text-gray-500 text-center">No channels found</p>
              )}
            </div>
          ) : categories.length > 0 ? (
            categories.map((cat) => {
              const catChannels = cat.channels.map((id) => channels[id]).filter(Boolean);
              const isCollapsed = collapsed[cat.id];

              return (
                <div key={cat.id}>
                  <button
                    onClick={() => toggleCat(cat.id)}
                    className="flex w-full items-center gap-1.5 px-1 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" strokeWidth={2} /> : <ChevronDown className="h-3 w-3" strokeWidth={2} />}
                    {cat.name}
                  </button>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-0.5 overflow-hidden"
                      >
                        {catChannels.map((ch) => (
                          <ChannelItem key={ch.id} channel={ch} />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            (() => {
              const grouped = Object.values(channels).reduce<Record<string, typeof channels>>((acc, ch) => {
                const cat = ch.category || "General";
                if (!acc[cat]) acc[cat] = {};
                acc[cat][ch.id] = ch;
                return acc;
              }, {});
              return Object.entries(grouped).map(([catName, catChannels]) => {
                const catId = `cat-${catName.toLowerCase().replace(/\s+/g, "-")}`;
                const isCollapsed = collapsed[catId];
                return (
                  <div key={catId}>
                    <button
                      onClick={() => toggleCat(catId)}
                      className="flex w-full items-center gap-1.5 px-1 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                    >
                      {isCollapsed ? <ChevronRight className="h-3 w-3" strokeWidth={2} /> : <ChevronDown className="h-3 w-3" strokeWidth={2} />}
                      {catName}
                    </button>
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-0.5 overflow-hidden"
                        >
                          {Object.values(catChannels).map((ch) => (
                            <ChannelItem key={ch.id} channel={ch} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      <CreateChannelModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
