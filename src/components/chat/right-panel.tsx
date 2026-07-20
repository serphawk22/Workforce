"use client";

import { useState } from "react";
import { useChat } from "./chat-provider";
import { type ChatMember } from "./mock-data";
import { Avatar } from "@/components/ui/avatar";
import {
  X,
  Hash,
  Lock,
  Calendar,
  Pin,
  Users,
  FileText,
  Image,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-amber-500",
  offline: "bg-gray-500",
};

const roleBadgeColors: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  moderator: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  developer: "bg-green-500/10 text-green-500 border-green-500/20",
  employee: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  developer: "Developer",
  employee: "Employee",
};

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" strokeWidth={2} /> : <ChevronRight className="h-3 w-3" strokeWidth={2} />}
        {title}
        {count !== undefined && <span className="ml-auto text-[10px] font-normal normal-case text-gray-400">{count}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MemberItem({ member }: { member: ChatMember }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="relative shrink-0">
        <Avatar name={member.name} size="sm" className="h-7 w-7" />
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${statusColors[member.status]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
      </div>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${roleBadgeColors[member.role] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
        {roleLabels[member.role]}
      </span>
    </div>
  );
}

export function RightPanel() {
  const { activeChannel, messages, currentChannelId, members, showRightPanel, toggleRightPanel, getMember } = useChat();
  const [memberSearch, setMemberSearch] = useState("");

  if (!showRightPanel || !activeChannel) return null;

  const channelMessages = messages[currentChannelId] || [];
  const pinnedMessages = channelMessages.filter((m) => m.isPinned);
  const filteredMembers = activeChannel.members
    .map((id) => getMember(id))
    .filter((m): m is ChatMember => m !== undefined)
    .filter((m) => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()));

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const order = { online: 0, away: 1, offline: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const onlineMembers = sortedMembers.filter((m) => m.status === "online");

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full border-l border-gray-200 bg-white overflow-hidden shrink-0"
    >
      <div className="w-[280px] h-full flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">Channel Info</h3>
          <button
            onClick={toggleRightPanel}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          <div className="px-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                {activeChannel.isPrivate ? <Lock className="h-4 w-4" strokeWidth={1.5} /> : <Hash className="h-4 w-4" strokeWidth={1.5} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">#{activeChannel.name}</p>
                <p className="text-xs text-gray-400">{activeChannel.isPrivate ? "Private" : "Public"} channel</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">{activeChannel.description}</p>

            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
              Created {new Date(activeChannel.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <CollapsibleSection title="Members" count={sortedMembers.length} defaultOpen>
            <div className="px-2 pb-2">
              <div className="relative mb-2 px-1">
                <Search className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Find members..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-7 pr-2 text-xs text-gray-700 placeholder-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/20"
                />
              </div>
              {onlineMembers.length > 0 && (
                <div className="mb-2">
                  <p className="px-1 py-1 text-[10px] font-semibold text-green-600 uppercase tracking-wider">Online — {onlineMembers.length}</p>
                  {onlineMembers.map((m) => (<MemberItem key={m.id} member={m} />))}
                </div>
              )}
              <div>
                <p className="px-1 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Offline — {sortedMembers.length - onlineMembers.length}</p>
                {sortedMembers.filter((m) => m.status !== "online").map((m) => (<MemberItem key={m.id} member={m} />))}
              </div>
            </div>
          </CollapsibleSection>

          {pinnedMessages.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <CollapsibleSection title="Pinned Messages" count={pinnedMessages.length}>
                <div className="px-3 pb-2 space-y-2">
                  {pinnedMessages.map((msg) => {
                    const author = getMember(msg.authorId);
                    return (
                      <div key={msg.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Pin className="h-3 w-3 text-[#3B82F6]" strokeWidth={1.5} />
                          <span className="text-xs font-medium text-gray-900">{author?.name || "Unknown"}</span>
                          <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{msg.content}</p>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            </>
          )}

          <div className="border-t border-gray-100" />
          <CollapsibleSection title="Shared Files" count={0} defaultOpen={false}>
            <div className="px-3 pb-2 text-center text-xs text-gray-400 py-4">
              No shared files yet
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </motion.div>
  );
}
