import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/** Server-side gate: only admin/owner roles may render ANY /admin page. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin" && user.role !== "owner") redirect("/forbidden");
  return <AdminShell user={user}>{children}</AdminShell>;
}
