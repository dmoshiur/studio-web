import { hasHaSession } from "@/lib/server/ha-session";
import { getPasscodeState, maybeAutoRotate } from "@/lib/server/passcode";
import { PasscodeGate } from "@/components/hackeradmin/passcode-gate";
import { OwnerShell } from "@/components/hackeradmin/owner-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: { default: "Operations Console", template: "%s · Operations Console" },
  robots: { index: false, follow: false },
};

/**
 * Server-side gate for the protected operations panel.
 *
 * Access requires the dedicated hackeradmin session, which is issued ONLY
 * after the rotating hourly passcode is verified server-side. Ordinary
 * user/admin sessions do not get in. When the session is missing or has
 * been revoked by a rotation, the passcode entry screen is rendered
 * instead of the panel — nothing else leaks.
 */
export default async function HackerAdminLayout({ children }: { children: React.ReactNode }) {
  // Keep the passcode lifecycle fresh on every panel render.
  await maybeAutoRotate();

  const authorized = await hasHaSession();
  if (!authorized) {
    const state = await getPasscodeState().catch(() => null);
    return (
      <PasscodeGate
        provisioned={state?.valid ?? false}
        smtpConfigured={state?.smtpConfigured ?? false}
        lockedUntil={state?.lockedUntil ?? null}
      />
    );
  }

  return <OwnerShell>{children}</OwnerShell>;
}
