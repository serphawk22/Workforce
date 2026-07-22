import { WorkspaceDashboardSidebar } from "@/components/workspace-dashboard/sidebar";

export default function WorkspaceDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <WorkspaceDashboardSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
