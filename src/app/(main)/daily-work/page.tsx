import { getEmployees, getProjects, getYesterdaysPlan } from "@/actions/daily-work";
import { DailyWorkForm } from "./daily-work-form";

export default async function DailyWorkPage() {
  const [employees, projects] = await Promise.all([
    getEmployees(),
    getProjects(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-[850px] px-4">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">Daily Work Sheet</h1>
          <p className="mt-1 text-sm text-gray-500">Fill in your daily work details below</p>
        </div>
        <DailyWorkForm employees={employees} projects={projects} />
      </div>
    </div>
  );
}
