"use client";

import * as React from "react";
import { Plus, ShieldCheck, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";
import type { Role } from "@/types";

interface AccountRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  disabled: boolean;
  createdAt?: string | null;
  lastSignInAt?: string | null;
}

interface AccountsResponse {
  users: AccountRow[];
  nextPageToken?: string | null;
}

const ROLE_TONE: Record<string, "gold" | "default" | "info"> = {
  superadmin: "gold",
  owner: "gold",
  admin: "info",
  user: "default",
};

/** Accounts panel — create staff logins and change roles (admin+). */
export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AccountRow[] | null>(null);
  const [canManage, setCanManage] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [suspending, setSuspending] = React.useState<AccountRow | null>(null);
  const [deleting, setDeleting] = React.useState<AccountRow | null>(null);
  const [form, setForm] = React.useState({ email: "", password: "", displayName: "", role: "admin" });
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    setError(null);
    try {
      // Owner routes expose role/disable management; fall back to the admin read-only list.
      let data: AccountsResponse | null = null;
      try {
        data = await api<AccountsResponse>("/api/owner/users?limit=100");
        setCanManage(true);
      } catch {
        data = await api<AccountsResponse>("/api/admin/users?limit=100");
        setCanManage(false);
      }
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      toast({ kind: "success", title: "Account created", message: `${form.email} can sign in now.` });
      setCreating(false);
      setForm({ email: "", password: "", displayName: "", role: "admin" });
      await load();
    } catch (err) {
      toast({ kind: "error", title: "Could not create account", message: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(uid: string, role: Role) {
    try {
      await api("/api/owner/users", { method: "PATCH", body: JSON.stringify({ uid, role }) });
      toast({ kind: "success", title: "Role updated" });
      await load();
    } catch (err) {
      toast({ kind: "error", title: "Role change failed", message: err instanceof Error ? err.message : undefined });
    }
  }

  async function toggleDisabled(user: AccountRow) {
    setBusy(true);
    try {
      await api(`/api/owner/users/${encodeURIComponent(user.uid)}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled: !user.disabled }),
      });
      toast({ kind: "success", title: user.disabled ? "Account enabled" : "Account suspended" });
      setSuspending(null);
      await load();
    } catch (err) {
      toast({ kind: "error", title: "Update failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(user: AccountRow) {
    setBusy(true);
    try {
      await api(`/api/owner/users/${encodeURIComponent(user.uid)}`, { method: "DELETE" });
      toast({ kind: "success", title: "Account deleted", message: `${user.email ?? user.uid} can no longer sign in.` });
      setDeleting(null);
      await load();
    } catch (err) {
      toast({ kind: "error", title: "Delete failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Access control"
        title="Accounts"
        description="Create staff logins, promote roles and suspend access. Owner-level changes are audit-logged."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New account
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !users ? (
        <TableSkeleton />
      ) : users.length === 0 ? (
        <EmptyState title="No accounts yet" message="Create the first staff login to share access to the studio." />
      ) : (
        <TableShell>
          <THead>
            <TH>Account</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Last sign-in</TH>
            <TH className="text-right">Actions</TH>
          </THead>
          <TBody>
            {users.map((u) => (
              <tr key={u.uid}>
                <TD>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold-500/40 font-serif text-[0.95rem] text-gold-300">
                      {(u.displayName ?? u.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ivory-100">{u.displayName ?? "—"}</p>
                      <p className="truncate text-[12px] text-ivory-500">{u.email ?? u.uid}</p>
                    </div>
                  </div>
                </TD>
                <TD>
                  {canManage ? (
                    <Select
                      value={u.role === "superadmin" ? "owner" : u.role}
                      aria-label={`Role for ${u.email ?? u.uid}`}
                      className="h-10 w-[142px] text-[12.5px]"
                      onChange={(e) => void changeRole(u.uid, e.target.value as Role)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </Select>
                  ) : (
                    <Badge variant={ROLE_TONE[u.role] ?? "default"}>{u.role}</Badge>
                  )}
                </TD>
                <TD>
                  <Badge variant={u.disabled ? "danger" : "success"}>{u.disabled ? "Suspended" : "Active"}</Badge>
                </TD>
                <TD className="text-[12.5px] text-ivory-500">
                  {u.lastSignInAt ? formatDateTime(u.lastSignInAt) : "—"}
                </TD>
                <TD>
                  <RowActions>
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          aria-label={u.disabled ? "Enable account" : "Disable account"}
                          onClick={() => (u.disabled ? void toggleDisabled(u) : setSuspending(u))}
                        >
                          {u.disabled ? <CheckCircle2 /> : <Ban />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="iconSm"
                          aria-label="Delete account"
                          className="text-danger hover:bg-danger/[0.08]"
                          onClick={() => setDeleting(u)}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </RowActions>
                </TD>
              </tr>
            ))}
          </TBody>
        </TableShell>
      )}

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Create an account"
        description="The new account can sign in immediately. Share the password securely and change it later."
      >
        <form onSubmit={createAccount} className="grid gap-4">
          <div>
            <Label htmlFor="new-name">Display name</Label>
            <Input
              id="new-name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Ada Lovelace"
            />
          </div>
          <div>
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="editor@example.com"
            />
          </div>
          <div>
            <Label htmlFor="new-password">Temporary password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <Label htmlFor="new-role">Role</Label>
            <Select id="new-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User — member access</option>
              <option value="admin">Admin — studio content</option>
              <option value="owner">Owner — full control</option>
            </Select>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <Button type="submit" loading={busy}>
              <ShieldCheck /> Create account
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.displayName ?? deleting.email}?` : "Delete account"}
        message="This permanently removes the account, its profile and its credentials. It cannot be undone."
        confirmLabel={busy ? "Deleting…" : "Delete account"}
        destructive
        requireTyping="DELETE"
        onConfirm={() => {
          if (deleting) void removeAccount(deleting);
        }}
      />

      <ConfirmDialog
        open={Boolean(suspending)}
        onClose={() => setSuspending(null)}
        title={suspending ? `Suspend ${suspending.displayName ?? suspending.email}?` : "Suspend account"}
        message="They are signed out of every device and blocked from signing in until re-enabled."
        confirmLabel={busy ? "Suspending…" : "Suspend"}
        destructive
        onConfirm={() => {
          if (suspending) void toggleDisabled(suspending);
        }}
      />
    </>
  );
}
