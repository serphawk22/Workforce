"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/profile";
import { Avatar } from "@/components/ui/avatar";

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; avatarUrl: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccess(false);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("avatarUrl", avatarUrl);

    const result = await updateProfile(formData);

    if (result?.success) {
      setSuccess(true);
      router.refresh();
    } else if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} url={avatarUrl || user.avatarUrl} size="lg" />
        <div>
          <p className="text-base font-semibold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name[0]}</p>}
      </div>

      <div>
        <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
        {errors.avatarUrl && <p className="text-sm text-red-500 mt-1">{errors.avatarUrl[0]}</p>}
        <p className="text-xs text-gray-400 mt-1">URL to your profile image. Leave empty for initials.</p>
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-700">Profile updated successfully.</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
