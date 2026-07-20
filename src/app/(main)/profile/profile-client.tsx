"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "@/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Camera,
  User,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Briefcase,
  MapPin,
  Globe,
  Code2,
  Link2,
  AtSign,
  Lock,
  Key,
  Smartphone,
  LogOut,
  Bell,
  Moon,
  Sun,
  Clock,
  BarChart3,
  Activity,
  Save,
  Undo2,
  Percent,
  RefreshCw,
  Building,
  CreditCard,
  Landmark,
  Phone,
  Hash,
  BookOpen,
  Target,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  History,
  Pencil,
  ExternalLink,
  Image,
  Trash2,
  Crop,
  Plus,
  Eye,
  EyeOff,
  Palette,
  Languages,
  Clock12,
  CalendarDays,
  Laptop,
  Smartphone as SmartphoneIcon,
} from "lucide-react";

type ActivityEntry = {
  id: string;
  action: string;
  taskTitle: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

type Props = {
  userId: string;
  name: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  themePreference: string;
  notificationPreferences: string;
  createdAt: string;
  totalAssignedTasks: number;
  totalReportedTasks: number;
  completedTasks: number;
  projectsCount: number;
  workUpdatesCount: number;
  completionPercent: number;
  activityEntries: ActivityEntry[];
};

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold text-gray-900 flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <p className="text-sm text-gray-900">{value}</p>
    </Field>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const activityLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "bg-blue-100 text-blue-700" },
  assigned: { label: "Assigned", color: "bg-amber-100 text-amber-700" },
  status_changed: { label: "Status Changed", color: "bg-purple-100 text-purple-700" },
  priority_changed: { label: "Priority Changed", color: "bg-red-100 text-red-700" },
  comment_added: { label: "Commented", color: "bg-green-100 text-green-700" },
  attachment_added: { label: "Attachment Added", color: "bg-indigo-100 text-indigo-700" },
  subtask_created: { label: "Subtask Created", color: "bg-cyan-100 text-cyan-700" },
};

function getActivityInfo(action: string) {
  return activityLabels[action] || { label: action, color: "bg-gray-100 text-gray-700" };
}

export function ProfileClient({
  name, email, displayName, avatarUrl, role, isActive,
  themePreference, createdAt,
  totalAssignedTasks, totalReportedTasks, completedTasks,
  projectsCount, workUpdatesCount, completionPercent,
  activityEntries,
}: Props) {
  const router = useRouter();
  const [localDisplayName, setLocalDisplayName] = useState(displayName || "");
  const [localAvatarUrl, setLocalAvatarUrl] = useState(avatarUrl || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localTheme, setLocalTheme] = useState(themePreference || "light");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(false);

  const fullName = displayName || name;
  const initials = fullName.charAt(0).toUpperCase();
  const memberSince = formatDate(createdAt);
  const completionColor = completionPercent === 100 ? "text-green-500" : "text-blue-500";

  const statCards = useMemo(() => [
    { icon: FolderKanban, label: "Projects", value: projectsCount.toString(), color: "text-blue-600", bg: "bg-blue-50" },
    { icon: CheckSquare, label: "Tasks", value: totalAssignedTasks.toString(), color: "text-amber-600", bg: "bg-amber-50" },
    { icon: CheckCircle, label: "Completed", value: completedTasks.toString(), color: "text-green-600", bg: "bg-green-50" },
    { icon: Clock, label: "Updates", value: workUpdatesCount.toString(), color: "text-purple-600", bg: "bg-purple-50" },
  ], [projectsCount, totalAssignedTasks, completedTasks, workUpdatesCount]);

  async function handleSave() {
    setLoading(true);
    setErrors({});
    setSuccess(false);

    if (password && password !== confirmPassword) {
      setErrors({ confirmPassword: ["Passwords do not match"] });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("displayName", localDisplayName);
    formData.set("avatarUrl", localAvatarUrl);
    formData.set("themePreference", localTheme);
    if (password) formData.set("password", password);

    const notifPrefs = JSON.stringify({
      email: emailNotifs,
      push: pushNotifs,
      desktop: desktopNotifs,
    });
    formData.set("notificationPreferences", notifPrefs);

    const result = await updateProfile(formData);

    if (result?.success) {
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      localStorage.setItem("theme", localTheme);
      if (localTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } else if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    }
    setLoading(false);
  }

  function handleCancel() {
    setLocalDisplayName(displayName || "");
    setLocalAvatarUrl(avatarUrl || "");
    setPassword("");
    setConfirmPassword("");
    setLocalTheme(themePreference || "light");
    setErrors({});
    setSuccess(false);
  }

  const hasChanges = localDisplayName !== (displayName || "")
    || localAvatarUrl !== (avatarUrl || "")
    || password !== ""
    || localTheme !== (themePreference || "light");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your personal information and account settings.</p>
          </div>
          <div className="flex items-center gap-3">
            {success && (
              <span className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Percent className="h-3.5 w-3.5" />
              <span className={completionColor}>{completionPercent}% complete</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCancel} disabled={loading || !hasChanges}>
              <Undo2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={loading}>
              <Save className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-6">

            <Card>
              <div className="p-5 text-center">
                <div className="relative inline-block">
                  <Avatar name={fullName} url={avatarUrl || undefined} size="xl" className="h-24 w-24 mx-auto ring-4 ring-white shadow-lg" />
                  <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors ring-2 ring-white">
                    <Camera className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
                <h2 className="mt-4 text-lg font-bold text-gray-900">{fullName}</h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="primary" size="sm">{role}</Badge>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <span className="h-2 w-2 rounded-full bg-green-500" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> Inactive
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2 text-left">
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <Mail className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>Joined {memberSince}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile Completion</span>
                  <span className={`text-xs font-bold ${completionColor}`}>{completionPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${completionPercent === 100 ? "bg-green-500" : "bg-blue-500"}`}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  {statCards.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">

            <CollapsibleSection title="Personal Information" icon={User}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name">
                  <p className="text-sm text-gray-900">{name}</p>
                </Field>
                <Field label="Display Name">
                  <input
                    value={localDisplayName}
                    onChange={(e) => setLocalDisplayName(e.target.value)}
                    placeholder="How others see you"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                  />
                </Field>
                <ReadonlyField label="Email" value={email} />
                <ReadonlyField label="Role" value={role} />
                <ReadonlyField label="Department" value="Engineering" />
                <ReadonlyField label="Member Since" value={memberSince} />
              </div>
              <div className="mt-4">
                <Field label="Bio">
                  <textarea
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none resize-none"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Profile Picture URL">
                  <div className="flex gap-2">
                    <input
                      value={localAvatarUrl}
                      onChange={(e) => setLocalAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                    />
                    {localAvatarUrl && (
                      <button className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors" title="Remove photo">
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                  {errors.avatarUrl && <p className="text-xs text-red-500 mt-1">{errors.avatarUrl[0]}</p>}
                  <p className="text-xs text-gray-400 mt-1">URL to your profile image. Leave empty for initials.</p>
                </Field>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Employment Details" icon={Briefcase} defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReadonlyField label="Employee ID" value="EMP-001" />
                <ReadonlyField label="Role" value={role} />
                <ReadonlyField label="Department" value="Engineering" />
                <ReadonlyField label="Manager" value="Jane Smith" />
                <ReadonlyField label="Joining Date" value={memberSince} />
                <ReadonlyField label="Employment Type" value="Full-time" />
                <ReadonlyField label="Work Location" value="Remote" />
                <ReadonlyField label="Office" value="HQ - San Francisco" />
                <ReadonlyField label="Leave Balance" value="12 days" />
              </div>
              {role === "ADMIN" && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <ReadonlyField label="Salary" value="$120,000 / year" />
                  <ReadonlyField label="Last Salary Date" value={memberSince} />
                  <ReadonlyField label="Payment Status" value="Paid" />
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Bank Details" icon={Landmark} defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReadonlyField label="Account Holder Name" value={fullName} />
                <ReadonlyField label="Bank Name" value="Not set" />
                <ReadonlyField label="Account Number" value="Not set" />
                <ReadonlyField label="IFSC Code" value="Not set" />
                <ReadonlyField label="Branch" value="Not set" />
                <ReadonlyField label="UPI ID" value="Not set" />
                <ReadonlyField label="PAN Number" value="Not set" />
                <ReadonlyField label="Tax ID" value="Not set" />
              </div>
              <div className="mt-4">
                <Button variant="secondary" size="sm" disabled>
                  <Save className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Save Bank Details
                </Button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Social Links" icon={Globe} defaultOpen={false}>
              <div className="space-y-4">
                {[
                  { icon: Code2, label: "GitHub", placeholder: "https://github.com/username" },

                  { icon: Link2, label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },

                  { icon: AtSign, label: "Twitter", placeholder: "https://twitter.com/username" },

                  { icon: Camera, label: "Instagram", placeholder: "https://instagram.com/username" },
                  { icon: Globe, label: "Personal Website", placeholder: "https://example.com" },
                ].map((link) => (
                  <div key={link.label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-400 shrink-0">
                      <link.icon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">{link.label}</p>
                      <div className="flex items-center gap-2">
                        <input
                          placeholder={link.placeholder}
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                        />
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition-colors" title="Open in new tab">
                          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Security & Password" icon={Lock}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Current Password">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-3.5 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </Field>
                <Field label="New Password">
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-3.5 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password[0]}</p>}
                </Field>
                <Field label="Confirm New Password">
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      minLength={6}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-3.5 pr-10 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword[0]}</p>}
                </Field>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                </div>
                <button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Enable
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">Leave password fields blank to keep your current password.</p>
            </CollapsibleSection>

            <CollapsibleSection title="Preferences" icon={Palette}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Theme">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocalTheme("light")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        localTheme === "light"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Sun className="h-4 w-4" strokeWidth={1.5} /> Light
                    </button>
                    <button
                      onClick={() => setLocalTheme("dark")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        localTheme === "dark"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Moon className="h-4 w-4" strokeWidth={1.5} /> Dark
                    </button>
                  </div>
                </Field>
                <ReadonlyField label="Language" value="English (US)" />
                <ReadonlyField label="Time Zone" value="UTC (Coordinated Universal Time)" />
                <ReadonlyField label="Date Format" value="MM/DD/YYYY" />
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notification Preferences</p>
                <div className="space-y-3">
                  {[
                    { icon: Mail, label: "Email Notifications", value: emailNotifs, set: setEmailNotifs },
                    { icon: Bell, label: "Push Notifications", value: pushNotifs, set: setPushNotifs },
                    { icon: Laptop, label: "Desktop Notifications", value: desktopNotifs, set: setDesktopNotifs },
                  ].map((notif) => (
                    <label key={notif.label} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <notif.icon className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                        <span className="text-sm text-gray-700">{notif.label}</span>
                      </div>
                      <button
                        onClick={() => notif.set(!notif.value)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          notif.value ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            notif.value ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Work Statistics" icon={BarChart3} defaultOpen={false}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: FolderKanban, label: "Projects", value: projectsCount.toString(), color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: CheckSquare, label: "Tasks Assigned", value: totalAssignedTasks.toString(), color: "text-amber-600", bg: "bg-amber-50" },
                  { icon: CheckCircle, label: "Completed", value: completedTasks.toString(), color: "text-green-600", bg: "bg-green-50" },
                  { icon: Clock, label: "Work Updates", value: workUpdatesCount.toString(), color: "text-purple-600", bg: "bg-purple-50" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center">
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} mb-2`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={1.5} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Task Completion</p>
                  <div className="space-y-3">
                    {[
                      { label: "Completed", value: completedTasks, total: totalAssignedTasks || 1, color: "bg-green-500" },
                      { label: "In Progress", value: Math.max(0, totalAssignedTasks - completedTasks), total: totalAssignedTasks || 1, color: "bg-blue-500" },
                    ].map((item) => {
                      const pct = Math.round((item.value / item.total) * 100);
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{item.label}</span>
                            <span className="font-medium text-gray-900">{item.value} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Monthly Productivity</p>
                  <div className="flex items-end justify-between gap-1 h-32 pt-4">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => {
                      const height = Math.floor(Math.random() * 80) + 10;
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-md bg-blue-500/80 hover:bg-blue-600 transition-all cursor-pointer"
                            style={{ height: `${height}%` }}
                            title={`${month}: ${height}%`}
                          />
                          <span className="text-[8px] text-gray-400">{month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">0</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Current Sprint</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">0</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Hours Logged</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{workUpdatesCount}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Updates Submitted</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">--</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Productivity</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Activity" icon={Activity} defaultOpen={false}>
              {activityEntries.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto h-8 w-8 text-gray-300" strokeWidth={1} />
                  <p className="mt-2 text-sm text-gray-400">No recent activity</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
                  <div className="space-y-4">
                    {activityEntries.map((entry) => {
                      const info = getActivityInfo(entry.action);
                      return (
                        <div key={entry.id} className="flex gap-4">
                          <div className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${info.color} ring-4 ring-white`}>
                            <Activity className="h-3 w-3" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${info.color} mr-1.5`}>
                                {info.label}
                              </span>
                              {entry.taskTitle && <span className="text-gray-900 font-medium">"{entry.taskTitle}"</span>}
                              {entry.fieldName && (
                                <span className="text-gray-500">
                                  {' '}— {entry.fieldName}{entry.oldValue && entry.newValue ? `: ${entry.oldValue} → ${entry.newValue}` : ""}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(entry.createdAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CollapsibleSection>

          </div>
        </div>
      </div>
    </div>
  );
}
