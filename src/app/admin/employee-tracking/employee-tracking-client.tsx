"use client";

import { useState, useMemo } from "react";
import type { TrackingData, EmployeeData } from "./page";
import { EmployeeDetailDrawer } from "./employee-detail-drawer";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  CheckSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Search,
  ExternalLink,
  FileText,
} from "lucide-react";

const statusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Testing: "bg-purple-50 text-purple-700",
  Done: "bg-emerald-50 text-emerald-700",
  Blocked: "bg-red-50 text-red-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-amber-50 text-amber-600",
  CRITICAL: "bg-red-50 text-red-600",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function ProductivityBar({ value }: { value: number }) {
  let color = "bg-red-500";
  if (value >= 70) color = "bg-emerald-500";
  else if (value >= 40) color = "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600">{value}%</span>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function EmployeeTrackingClient({ data }: { data: TrackingData }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredEmployees = useMemo(() => {
    let result = [...data.employees];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter) {
      result = result.filter((e) => e.role === roleFilter);
    }

    if (statusFilter) {
      if (statusFilter === "online") result = result.filter((e) => e.online);
      else if (statusFilter === "overdue") result = result.filter((e) => e.overdueTasks > 0);
      else if (statusFilter === "inactive") result = result.filter((e) => e.totalTasks === 0);
    }

    if (projectFilter) {
      result = result.filter((e) => e.projects.some((p) => p.id === projectFilter));
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => e.lastWorkUpdate && new Date(e.lastWorkUpdate).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      result = result.filter((e) => e.lastWorkUpdate && new Date(e.lastWorkUpdate).getTime() <= to);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "productivity": return b.productivity - a.productivity;
        case "completed": return b.completedTasks - a.completedTasks;
        case "name": return a.name.localeCompare(b.name);
        case "recent": {
          const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          return bTime - aTime;
        }
        default: return 0;
      }
    });

    return result;
  }, [data.employees, search, roleFilter, projectFilter, statusFilter, sortBy, dateFrom, dateTo]);

  const projects = data.projects;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employee Work Tracking</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor employee productivity, task progress, and work updates</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <KPICard icon={Users} label="Total Employees" value={data.totalEmployees} />
          <KPICard icon={Briefcase} label="Working Today" value={data.workingToday} />
        <KPICard icon={CheckSquare} label="Tasks Assigned" value={data.totalAssigned} />
        <KPICard icon={CheckCircle} label="Completed Today" value={data.completedToday} />
        <KPICard icon={AlertTriangle} label="Overdue Tasks" value={data.overdueCount} />
          <KPICard icon={Clock} label="Updates Today" value={data.workUpdatesToday} />
          <KPICard icon={FileText} label="Daily Sheets" value={data.dailySheetsToday} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="" className="text-gray-900">All Roles</option>
          <option value="ADMIN" className="text-gray-900">Admin</option>
          <option value="EMPLOYEE" className="text-gray-900">Employee</option>
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="" className="text-gray-900">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="text-gray-900">{p.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="" className="text-gray-900">All Status</option>
          <option value="online" className="text-gray-900">Online</option>
          <option value="overdue" className="text-gray-900">Has Overdue</option>
          <option value="inactive" className="text-gray-900">No Tasks</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="name" className="text-gray-900">Sort: Name</option>
          <option value="productivity" className="text-gray-900">Sort: Productivity</option>
          <option value="completed" className="text-gray-900">Sort: Completed Tasks</option>
          <option value="recent" className="text-gray-900">Sort: Recent Activity</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Done</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Update</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productivity</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">No employees found</td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={employee.name} url={employee.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
                        <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{employee.totalTasks}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-emerald-600">{employee.completedTasks}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">{employee.inProgressTasks}</td>
                  <td className="px-4 py-3">
                    {employee.overdueTasks > 0 ? (
                      <span className="text-sm font-medium text-red-600">{employee.overdueTasks}</span>
                    ) : (
                      <span className="text-sm text-gray-500">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{employee.hoursLogged}h</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(employee.lastWorkUpdate)}</td>
                  <td className="px-4 py-3">
                    <ProductivityBar value={employee.productivity} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedEmployee(employee)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      View Details
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Showing {filteredEmployees.length} of {data.employees.length} employees
      </p>

      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
