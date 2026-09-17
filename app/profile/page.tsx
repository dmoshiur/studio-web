import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { isAdminRole } from "@/types";
import { ProfileDashboard } from "./profile-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?next=/profile");
  return <ProfileDashboard canAdmin={isAdminRole(user.role)} />;
}
