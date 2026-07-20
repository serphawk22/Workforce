"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  Star,
  UserPlus,
  Copy,
  FileStack,
  Palette,
  Bell,
  BarChart3,
  Download,
  Link as LinkIcon,
  Archive,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Mail,
  Layout,
  Bookmark,
  Image,
  Paintbrush,
  MessageSquare,
  Activity,
  UserCheck,
  BellOff,
  Timer,
  FileSpreadsheet,
  FileText,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type MenuView = "main" | "customize" | "notifications" | "export";

type ProjectActionsDropdownProps = {
  projectId: string;
  projectName: string;
  projectKey: string | null;
  workspaceName: string;
  membersCount: number;
  tasksCount: number;
  createdAt: string;
};

const dropdownTransition = {
  duration: 0.12,
  ease: [0.16, 1, 0.3, 1] as readonly [number, number, number, number],
};

const subTransition = { duration: 0.15, ease: "easeOut" as const };

const itemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-gray-700 transition-colors hover:bg-[#F8FAFC] dark:text-gray-300 dark:hover:bg-gray-800/60";
const itemIconClass = "h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500";
const dividerClass = "my-1 border-t border-gray-100 dark:border-gray-800";
const backClass =
  "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-[#F8FAFC] dark:text-gray-400 dark:hover:bg-gray-800/60";

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  right,
}: {
  icon: typeof Star;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`${itemClass} ${danger ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" : ""}`}
    >
      <Icon className={`${itemIconClass} ${danger ? "text-red-500 dark:text-red-400" : ""}`} />
      <span className="flex-1 text-left">{label}</span>
      {right && <span className="shrink-0 flex items-center">{right}</span>}
    </button>
  );
}

function MenuLink({
  icon: Icon,
  label,
  href,
  right,
}: {
  icon: typeof Star;
  label: string;
  href: string;
  right?: React.ReactNode;
}) {
  return (
    <Link href={href} className={itemClass}>
      <Icon className={itemIconClass} />
      <span className="flex-1 text-left">{label}</span>
      {right && <span className="shrink-0 flex items-center">{right}</span>}
    </Link>
  );
}

function SubmenuItem({
  icon: Icon,
  label,
  onClick,
  checked,
}: {
  icon: typeof Star;
  label: string;
  onClick?: () => void;
  checked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${itemClass} ${checked ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : ""}`}
    >
      <Icon className={itemIconClass} />
      <span className="flex-1 text-left">{label}</span>
      {checked !== undefined && (
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
            checked
              ? "border-primary bg-primary text-white"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}

function SubmenuBack({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button onClick={onBack} className={backClass}>
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
      <span>{label}</span>
      <span className="font-medium text-gray-600 dark:text-gray-300 truncate max-w-[160px] text-right">
        {value}
      </span>
    </div>
  );
}

export function ProjectActionsDropdown({
  projectId,
  projectName,
  projectKey,
  workspaceName,
  membersCount,
  tasksCount,
  createdAt,
}: ProjectActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuIndex, setMenuIndex] = useState(-1);

  const [showInvite, setShowInvite] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`fav-project-${projectId}`);
      if (stored === "true") setIsFavorited(true);
    } catch {}
  }, [projectId]);

  const close = useCallback(() => {
    setIsOpen(false);
    setMenuIndex(-1);
    setTimeout(() => setView("main"), 200);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { close(); }
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, close]);

  const toggleFav = useCallback(() => {
    const next = !isFavorited;
    setIsFavorited(next);
    try { localStorage.setItem(`fav-project-${projectId}`, next ? "true" : "false"); } catch {}
  }, [isFavorited, projectId]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + `/project/${projectId}/board`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [projectId]);

  function openSub(v: MenuView) {
    setView(v);
    setMenuIndex(-1);
  }

  function renderMain() {
    return (
      <motion.div key="main" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={subTransition} className="p-1">
        <div className="px-2.5 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest dark:text-gray-500">
            {projectName}
          </p>
          {projectKey && (
            <p className="mt-0.5 text-[10px] font-mono text-gray-300 dark:text-gray-600">
              {projectKey}
            </p>
          )}
        </div>

        <MenuItem
          icon={Star}
          label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
          onClick={toggleFav}
          right={isFavorited ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : undefined}
        />

        <div className={dividerClass} />

        <MenuItem icon={UserPlus} label="Invite Members" onClick={() => { close(); setShowInvite(true); }} />
        <MenuItem icon={Copy} label="Duplicate Project" onClick={() => { close(); setShowDuplicate(true); }} />
        <MenuItem icon={FileStack} label="Save as Template" onClick={() => { close(); setShowTemplate(true); }} />

        <div className={dividerClass} />

        <MenuItem icon={Palette} label="Customize Appearance" onClick={() => openSub("customize")} right={<ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />} />
        <MenuItem icon={Bell} label="Notification Settings" onClick={() => openSub("notifications")} right={<ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />} />
        <MenuLink icon={BarChart3} label="Project Analytics" href={`/project/${projectId}/analytics`} />
        <MenuItem icon={Download} label="Export" onClick={() => openSub("export")} right={<ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />} />
        <MenuItem
          icon={LinkIcon}
          label={copied ? "Link Copied!" : "Copy Project Link"}
          onClick={copyLink}
          right={copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : undefined}
        />

        <div className={dividerClass} />

        <MenuItem icon={Archive} label="Archive Project" onClick={() => { close(); setShowArchive(true); }} />
        <MenuLink icon={Settings} label="Project Settings" href={`/project/${projectId}/settings`} right={<ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />} />
        <MenuItem icon={Trash2} label="Delete Project" danger onClick={() => { close(); setShowDelete(true); }} />

        <div className={dividerClass} />

        <div className="px-2.5 py-2 space-y-1.5">
          <InfoRow label="Project Type" value="Workspace" />
          <InfoRow label="Team Managed" value={workspaceName} />
          <InfoRow label="Members" value={`${membersCount}`} />
          <InfoRow label="Tasks" value={`${tasksCount}`} />
          <InfoRow
            label="Created"
            value={new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>
      </motion.div>
    );
  }

  function renderCustomize() {
    return (
      <motion.div key="customize" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={subTransition} className="p-1">
        <SubmenuBack label="Customize Appearance" onBack={() => setView("main")} />
        <div className={dividerClass} />
        <MenuItem icon={Layout} label="Project Color" />
        <MenuItem icon={Bookmark} label="Project Icon" />
        <MenuItem icon={Image} label="Cover Image" />
        <MenuItem icon={Paintbrush} label="Accent Theme" />
      </motion.div>
    );
  }

  function renderNotifications() {
    return (
      <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={subTransition} className="p-1">
        <SubmenuBack label="Notification Settings" onBack={() => setView("main")} />
        <div className={dividerClass} />
        <SubmenuItem icon={Activity} label="All Activity" />
        <SubmenuItem icon={MessageSquare} label="Mentions Only" />
        <SubmenuItem icon={UserCheck} label="Assigned Tasks" />
        <SubmenuItem icon={Timer} label="Sprint Updates" />
        <SubmenuItem icon={BellOff} label="Mute Project" />
      </motion.div>
    );
  }

  function renderExport() {
    return (
      <motion.div key="export" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={subTransition} className="p-1">
        <SubmenuBack label="Export" onBack={() => setView("main")} />
        <div className={dividerClass} />
        <MenuItem icon={FileSpreadsheet} label="CSV" />
        <MenuItem icon={FileSpreadsheet} label="Excel" />
        <MenuItem icon={FileText} label="PDF" />
        <MenuItem icon={FileJson} label="JSON" />
      </motion.div>
    );
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="Project actions"
          aria-expanded={isOpen}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={dropdownTransition}
              className="absolute right-0 top-full mt-2 z-50 w-[280px] origin-top-right overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30"
            >
              <div className="max-h-[75vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {view === "main" && renderMain()}
                  {view === "customize" && renderCustomize()}
                  {view === "notifications" && renderNotifications()}
                  {view === "export" && renderExport()}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showInvite && (
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          projectName={projectName}
        />
      )}

      {showDuplicate && (
        <DuplicateModal
          open={showDuplicate}
          onClose={() => setShowDuplicate(false)}
          projectName={projectName}
        />
      )}

      {showTemplate && (
        <TemplateModal
          open={showTemplate}
          onClose={() => setShowTemplate(false)}
          projectName={projectName}
        />
      )}

      {showArchive && (
        <ArchiveConfirm
          open={showArchive}
          onClose={() => setShowArchive(false)}
          projectName={projectName}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          open={showDelete}
          onClose={() => setShowDelete(false)}
          projectName={projectName}
        />
      )}
    </>
  );
}

/* ────────────── Invite Modal ────────────── */

function InviteModal({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={`Invite to ${projectName}`} size="sm">
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
            Search Members
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
            Invite by Email
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
              />
            </div>
            <select className="rounded-xl border border-gray-200 bg-white px-2.5 py-2.5 text-sm text-gray-700 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <option>Member</option>
              <option>Admin</option>
              <option>Viewer</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (email.trim()) {
                setSent(true);
                setTimeout(() => {
                  setSent(false);
                  setEmail("");
                  onClose();
                }, 1200);
              }
            }}
            disabled={!email.trim()}
            loading={sent}
          >
            {sent ? "Invitation Sent!" : "Send Invite"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ────────────── Duplicate Modal ────────────── */

function DuplicateModal({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  const [name, setName] = useState(`${projectName} (Copy)`);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeSprints, setIncludeSprints] = useState(true);

  useEffect(() => {
    if (open) setName(`${projectName} (Copy)`);
  }, [open, projectName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Copy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Duplicate Project
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create a copy of this project
              </p>
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-600 mb-1.5 dark:text-gray-400">
            Project Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTasks}
                onChange={(e) => setIncludeTasks(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include tasks</p>
                <p className="text-xs text-gray-400">Copy all tasks and subtasks</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSprints}
                onChange={(e) => setIncludeSprints(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include sprints</p>
                <p className="text-xs text-gray-400">Copy sprint configuration and schedule</p>
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Duplicate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Save as Template Modal ────────────── */

function TemplateModal({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  const [name, setName] = useState(`${projectName} Template`);
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (open) { setName(`${projectName} Template`); setDesc(""); }
  }, [open, projectName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
              <FileStack className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Save as Template
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Preserve workflows, columns, labels, and task types
              </p>
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-600 mb-1.5 dark:text-gray-400">
            Template Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />

          <label className="block text-xs font-medium text-gray-600 mt-4 mb-1.5 dark:text-gray-400">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="What does this template include?"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none resize-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Save Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Archive Confirm ────────────── */

function ArchiveConfirm({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
              <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Archive Project
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Move <span className="font-medium text-gray-700 dark:text-gray-300">{projectName}</span> to the
                archived section. All data is preserved and can be restored later.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Archive Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Delete Confirm ────────────── */

function DeleteConfirm({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-in-up">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Delete Project
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone. All tasks, sprints, and data will be permanently deleted.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <label className="block text-xs font-medium text-gray-600 mb-1.5 dark:text-gray-400">
              Type{" "}
              <span className="font-bold text-red-600 dark:text-red-400">{projectName}</span> to
              confirm
            </label>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={projectName}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 transition-all hover:border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={text !== projectName}
              onClick={onClose}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
