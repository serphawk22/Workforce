import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Nav } from "@/components/nav";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await requireSetup();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      themePreference: true,
      notificationPreferences: true,
    },
  });

  if (!user) return <div>User not found</div>;

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <ProfileForm user={user} />
        </div>
      </main>
    </div>
  );
}
