import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { OwnerShell } from "@/components/hackeradmin/owner-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: { default: "Owner Console", template: "%s · Owner Console" },
  robots: { index: false, follow: false },
};

/**
 * Server-side gate: ONLY role=owner may render /hackeradmin.
 * Admins, users and anonymous visitors are all rejected here,
 * and every /api/owner/* route re-verifies independently.
 */
export default async function HackerAdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?next=/hackeradmin");
  if (user.role !== "owner") redirect("/forbidden");
  return <OwnerShell user={user}>{children}</OwnerShell>;
}
