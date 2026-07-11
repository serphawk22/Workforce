"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/actions/comment";
import { getTaskDetails } from "@/actions/task-queries";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type CommentData = {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
};

export function CommentSection({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  useEffect(() => {
    getTaskDetails(taskId).then((task) => {
      if (task) {
        setComments(
          task.comments.map((c) => ({
            id: c.id,
            content: c.content,
            author: { id: c.author.id, name: c.author.name },
            createdAt: c.createdAt.toISOString(),
          }))
        );
      }
      setInitialLoaded(true);
    });
  }, [taskId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("content", content);
    await addComment(formData);
    setContent("");
    setLoading(false);
    const task = await getTaskDetails(taskId);
    if (task) {
      setComments(
        task.comments.map((c) => ({
          id: c.id,
          content: c.content,
          author: { id: c.author.id, name: c.author.name },
          createdAt: c.createdAt.toISOString(),
        }))
      );
    }
    router.refresh();
  }

  async function handleDelete(commentId: string) {
    const formData = new FormData();
    formData.set("commentId", commentId);
    await deleteComment(formData);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setDeleteCommentId(null);
    router.refresh();
  }

  if (!initialLoaded) return <div className="text-sm text-gray-400 py-4">Loading comments...</div>;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Comments ({comments.length})</h3>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="mt-2 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Comment"}
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                  {c.author.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{c.author.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <button
                  onClick={() => setDeleteCommentId(c.id)}
                  className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No comments yet</p>}
      </div>

      <ConfirmDialog
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => deleteCommentId && handleDelete(deleteCommentId)}
        title="Delete Comment"
        message="Delete this comment? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
