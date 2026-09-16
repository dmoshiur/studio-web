"use client";

import * as React from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/hooks/use-session";
import { getFirebaseAuth } from "@/lib/firebase/client";

export default function AdminProfilePage() {
  const { user, loading } = useSession();
  const { toast } = useToast();
  const [sending, setSending] = React.useState(false);

  async function sendReset() {
    if (!user?.email) return;
    setSending(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth not configured");
      await sendPasswordResetEmail(auth, user.email);
      toast({ kind: "success", title: "Reset email sent", message: `Check ${user.email} for a password reset link.` });
    } catch (e) {
      toast({ kind: "error", title: "Failed to send reset email", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your admin account" />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in via Firebase Authentication</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-ivory-400/80">Loading…</p>
            ) : user ? (
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-sm bg-white/[0.03] px-4 py-3">
                  <dt className="text-ivory-400/80">Name</dt>
                  <dd className="font-semibold text-ivory-50">{user.displayName ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-sm bg-white/[0.03] px-4 py-3">
                  <dt className="text-ivory-400/80">Email</dt>
                  <dd className="font-semibold text-ivory-50">{user.email ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-sm bg-white/[0.03] px-4 py-3">
                  <dt className="text-ivory-400/80">Role</dt>
                  <dd><Badge variant={user.role === "owner" || user.role === "superadmin" ? "gold" : "info"}>{user.role}</Badge></dd>
                </div>
                <div className="flex items-center justify-between rounded-sm bg-white/[0.03] px-4 py-3">
                  <dt className="text-ivory-400/80">Email verified</dt>
                  <dd>
                    {user.emailVerified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-ivory-400/80">Not signed in.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password via a secure email link</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" onClick={sendReset} loading={sending} disabled={!user?.email}>
              Send password reset email
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
