import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { isAdminRole } from "@/types";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/** Server-side gate: admin, owner and superadmin may render ANY /admin page. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminRole(user.role)) redirect("/forbidden");
  return <AdminShell user={user}>{children}</AdminShell>;
}
