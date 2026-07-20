import { requireAdmin } from "@/lib/authorization";
import { getEmployees, getProjects } from "@/actions/daily-work";
import { DailyWorkTracker } from "./daily-work-tracker";

export default async function AdminDailyWorkPage() {
  await requireAdmin();

  const [employees, projects] = await Promise.all([
    getEmployees(),
    getProjects(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Work Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">View and filter all daily work submissions</p>
      </div>
      <DailyWorkTracker employees={employees} projects={projects} />
    </div>
  );
}
