"use client";

import * as React from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/hooks/use-session";

/**
 * Studio profile — account facts plus an in-app password change.
 * The old "send password reset email" button used Firebase's default reset
 * mail flow; password changes now happen directly here (current password
 * verification + scrypt rehash) and every transactional email is delivered
 * by the studio's custom SMTP transport instead.
 */
export default function AdminProfilePage() {
  const { user, loading } = useSession();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) return setError("New password needs at least 8 characters.");
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword))
      return setError("New password needs both letters and numbers.");
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Password change failed");
      toast({ kind: "success", title: "Password changed", message: data.message ?? "Other sessions were signed out." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your admin account" />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in to the Photography studio</CardDescription>
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
                  <dd>
                    <Badge variant={user.role === "owner" || user.role === "superadmin" ? "gold" : "info"}>{user.role}</Badge>
                  </dd>
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
            <CardDescription>
              Change your password directly — no email round-trip, effective immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid max-w-md gap-4">
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={saving || !user}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters, letters + numbers"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving || !user}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Repeat new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving || !user}
                  required
                />
              </div>
              {error && <FieldError message={error} />}
              <Button type="submit" loading={saving} disabled={!user} className="w-fit">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Update password
              </Button>
            </form>
            <div className="mt-6 flex items-start gap-3 border-t border-white/[0.07] pt-5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              <p className="text-[12px] leading-relaxed text-ivory-500">
                Changing your password revokes every other active session. Password-reset emails
                (for forgotten passwords) are sent from the studio&apos;s own SMTP server.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
