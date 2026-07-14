"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/profile";
import { Avatar } from "@/components/ui/avatar";


type UserData = {
  name: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  notificationPreferences: unknown;
};

export function ProfileForm({ user }: { user: UserData }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccess(false);

    if (password && password !== confirmPassword) {
      setErrors({ confirmPassword: ["Passwords do not match"] });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("displayName", displayName);
    formData.set("avatarUrl", avatarUrl);
    if (password) formData.set("password", password);

    const result = await updateProfile(formData);

    if (result?.success) {
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      router.refresh();
    } else if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={displayName || user.name} url={avatarUrl || user.avatarUrl} size="lg" />
        <div>
          <p className="text-base font-semibold text-gray-900">{displayName || user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Info</h3>
        <p className="text-xs text-gray-500 mb-3">
          Email and Role cannot be changed.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <p className="text-sm text-gray-900">{user.role}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Display Name</h3>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How others see you"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Profile Picture</h3>
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

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Change Password</h3>
        <p className="text-xs text-gray-500 mb-3">Leave blank to keep current password.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
            />
            {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password[0]}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              placeholder="Repeat password"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
            />
            {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword[0]}</p>}
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-700">Profile updated successfully.</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
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
