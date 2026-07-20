"use client";

import { useState } from "react";
import { useChat } from "./chat-provider";
import { X, UserPlus, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeChannel, workspaceMembers, addMemberToChannel, channels } = useChat();
  const [added, setAdded] = useState<Record<string, boolean>>({});

  if (!open || !activeChannel) return null;
  const channelId = activeChannel.id;

  const channelMembers = activeChannel.members || [];
  const available = workspaceMembers.filter((m) => !channelMembers.includes(m.id) && m.id !== activeChannel.createdBy);

  async function handleInvite(id: string) {
    await addMemberToChannel(channelId, id);
    setAdded((prev) => ({ ...prev, [id]: true }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Invite to #{activeChannel.name}</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-1">
            {available.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">All workspace members are already in this channel</p>
            ) : (
              available.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                      {m.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(m.id)}
                    disabled={added[m.id]}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      added[m.id]
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                    }`}
                  >
                    {added[m.id] ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    {added[m.id] ? "Added" : "Invite"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-end px-5 py-4 border-t border-gray-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
