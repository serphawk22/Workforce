"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addComment } from "@/actions/comment";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { formatDateShort } from "@/lib/dates";
import { Send, Trash2 } from "lucide-react";

export function CommentSection({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/activity-log/${taskId}`).then(r => r.ok && r.json()).then(d => {
      if (d?.logs) setComments(d.logs.filter((l: any) => l.action === "comment_added"));
    });
  }, [taskId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("content", content);
    const result = await addComment(formData);
    if (result?.success) {
      setContent("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        Comments
        {comments.length > 0 && (
          <span className="text-xs text-gray-400 font-normal">({comments.length})</span>
        )}
      </h4>

      <form onSubmit={handleSubmit} className="mb-5">
        <div className="flex gap-3">
          <Avatar name={session?.user?.name || "You"} size="sm" />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" size="sm" loading={loading} disabled={!content.trim()}>
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </form>

      {comments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>
      )}

      <div className="space-y-4">
        {comments.map((c: any) => (
          <div key={c.id} className="flex gap-3">
            <Avatar name={c.user?.name || "?"} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">{c.user?.name}</span>
                <span className="text-xs text-gray-400">{formatDateShort(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-600">{c.newValue}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
