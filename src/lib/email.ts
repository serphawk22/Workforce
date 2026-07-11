import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

function getResend(): Resend {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(resendApiKey);
}

function inviteEmailHtml({
  workspaceName,
  invitedByName,
  inviteLink,
  expiresAt,
}: {
  workspaceName: string;
  invitedByName: string;
  inviteLink: string;
  expiresAt: Date;
}): string {
  const expiresFormatted = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspace Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 40px 0 40px;text-align:center;">
              <div style="width:48px;height:48px;background-color:#2563eb;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <rect width="28" height="28" rx="6" fill="white"/>
                  <path d="M8 14L12 18L20 10" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">Workspace Invitation</h1>
              <p style="margin:0 0 4px 0;font-size:15px;color:#6b7280;line-height:1.5;">
                You've been invited to join
              </p>
              <p style="margin:0 0 24px 0;font-size:18px;font-weight:600;color:#111827;">
                ${workspaceName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:14px;color:#6b7280;padding-bottom:4px;">Invited by</td>
                </tr>
                <tr>
                  <td style="font-size:15px;font-weight:500;color:#111827;">${invitedByName}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;text-align:center;">
              <a href="${inviteLink}" style="display:inline-block;background-color:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                Accept Invitation
              </a>
              <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;">
                This invitation expires on ${expiresFormatted}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px 40px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;">
                If you don't have an account yet, you'll be able to create one after clicking the link.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                TaskFlow &mdash; Project Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendInviteEmail({
  email,
  workspaceName,
  invitedByName,
  token,
  expiresAt,
}: {
  email: string;
  workspaceName: string;
  invitedByName: string;
  token: string;
  expiresAt: Date;
}) {
  const inviteLink = `${appUrl}/invite/${token}`;

  if (!resendApiKey) {
    console.log("[Email] DEV MODE: Invitation email preview");
    console.log(`[Email] To: ${email}`);
    console.log(`[Email] Subject: You're invited to ${workspaceName}`);
    console.log(`[Email] Invite link: ${inviteLink}`);
    console.log(`[Email] Invited by: ${invitedByName}`);
    return { success: true, devMode: true };
  }

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: "TaskFlow <onboarding@resend.dev>",
      to: email,
      subject: `You're invited to ${workspaceName}`,
      html: inviteEmailHtml({ workspaceName, invitedByName, inviteLink, expiresAt }),
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Invite sent to", email, "id:", data?.id);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[Email] Unexpected error:", message);
    return { success: false, error: message };
  }
}
