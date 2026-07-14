import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const session = await auth();

  const invite = await prisma.pendingInvite.findUnique({
    where: { token },
    include: {
      workspace: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-gray-500">This invitation link is invalid or has been removed.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (invite.status !== "PENDING") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Invitation {invite.status.toLowerCase()}</h1>
          <p className="mt-2 text-sm text-gray-500">This invitation has already been {invite.status.toLowerCase()}.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Invitation Expired</h1>
          <p className="mt-2 text-sm text-gray-500">This invitation expired on {invite.expiresAt.toLocaleDateString()}. Ask the workspace owner to send a new one.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect(`/register?email=${encodeURIComponent(invite.email)}&invite=${token}`);
  }

  if (session.user.email !== invite.email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Wrong Account</h1>
          <p className="mt-2 text-sm text-gray-500">
            You are logged in as {session.user.email}, but this invitation was sent to {invite.email}.
            Please sign out and sign in with the correct account.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/api/auth/signout"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Sign out
            </Link>
            <Link href="/" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const alreadyMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: invite.workspaceId } },
  });

  if (alreadyMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Already a Member</h1>
          <p className="mt-2 text-sm text-gray-500">You are already a member of {invite.workspace.name}.</p>
          <Link href={`/workspace/${invite.workspace.id}`} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Go to workspace
          </Link>
        </div>
      </div>
    );
  }

  await prisma.workspaceMember.create({
    data: { userId: session.user.id, workspaceId: invite.workspaceId, role: "MEMBER" },
  });

  await prisma.pendingInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED" },
  });

  redirect(`/workspace/${invite.workspace.id}`);
}
