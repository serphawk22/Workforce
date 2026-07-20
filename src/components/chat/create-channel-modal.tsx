"use client";

import { useState } from "react";
import { useChat } from "./chat-provider";
import { X, Hash, Lock, Globe, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateChannelModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addChannel } = useChat();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    await addChannel(
      name.trim(),
      description.trim(),
      category.trim() || "General",
      isPrivate
    );
    setName("");
    setDescription("");
    setCategory("");
    setIsPrivate(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 overflow-hidden dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Create Channel</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 dark:text-gray-400">Channel Name</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. marketing, design"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 dark:text-gray-400">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 focus:outline-none resize-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 dark:text-gray-400">Category</label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. General, Development, Design"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 dark:text-gray-400">Visibility</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                    !isPrivate
                      ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" strokeWidth={1.5} /> Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                    isPrivate
                      ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Private
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={!name.trim()}>
              Create Channel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
