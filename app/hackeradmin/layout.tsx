import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { isOwnerRole } from "@/types";
import { OwnerShell } from "@/components/hackeradmin/owner-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: { default: "Owner Console", template: "%s · Owner Console" },
  robots: { index: false, follow: false },
};

/**
 * Server-side gate: only owner / superadmin roles may render /hackeradmin.
 * Admins, users and anonymous visitors are all rejected here,
 * and every /api/owner/* route re-verifies independently.
 */
export default async function HackerAdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?next=/hackeradmin");
  if (!isOwnerRole(user.role)) redirect("/forbidden");
  return <OwnerShell user={user}>{children}</OwnerShell>;
}
