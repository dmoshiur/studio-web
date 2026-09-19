"use client";

import * as React from "react";
import { Ban, CheckCircle2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldHint } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { TableSkeleton, EmptyState, ErrorState, LoadMore } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import type { Role } from "@/types";

interface OwnerUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  disabled: boolean;
  role: Role;
  createdAt: string;
  lastSignInAt: string;
}

/**
 * Users & roles — operations console.
 *
 * Role naming:
 *   user       → member account
 *   admin      → Site Admin (content studio)
 *   owner      → HackerAdmin (this operations console)
 *   superadmin → Super Admin (unrestricted)
 */

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "user", label: "User", hint: "member access" },
  { value: "admin", label: "Site Admin", hint: "content studio + sub-admins" },
  { value: "owner", label: "HackerAdmin", hint: "this operations console" },
  { value: "superadmin", label: "Super Admin", hint: "unrestricted" },
];

const ROLE_LABEL: Record<string, string> = {
  user: "User",
  admin: "Site Admin",
  owner: "HackerAdmin",
  superadmin: "Super Admin",
};

const ROLE_TONE: Record<string, "gold" | "default" | "info"> = {
  superadmin: "gold",
  owner: "gold",
  admin: "info",
  user: "default",
};

function roleHint(role: Role): string {
  switch (role) {
    case "user":
      return "lose all admin access";
    case "admin":
      return "gain content-studio access and can add sub-admins";
    case "owner":
      return "gain FULL HackerAdmin control including this console";
    case "superadmin":
      return "gain unrestricted control of the entire platform";
  }
}

export default function OwnerUsersPage() {
  const [users, setUsers] = React.useState<OwnerUser[]>([]);
  const [pageToken, setPageToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [changing, setChanging] = React.useState<{ user: OwnerUser; role: Role } | null>(null);
  const [toggling, setToggling] = React.useState<OwnerUser | null>(null);
  const [deleting, setDeleting] = React.useState<OwnerUser | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", password: "", displayName: "", role: "admin" as Role });
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const load = React.useCallback(async (token?: string | null, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const url = token ? `/api/owner/users?pageToken=${encodeURIComponent(token)}` : "/api/owner/users";
      const data = await api<{ users: OwnerUser[]; nextPageToken: string | null }>(url);
      setUsers((prev) => (append ? [...prev, ...data.users] : data.users));
      setPageToken(data.nextPageToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function confirmRoleChange() {
    if (!changing) return;
    setBusy(true);
    try {
      await api("/api/owner/users", {
        method: "PATCH",
        body: JSON.stringify({ uid: changing.user.uid, role: changing.role }),
      });
      setUsers((prev) => prev.map((u) => (u.uid === changing.user.uid ? { ...u, role: changing.role } : u)));
      setChanging(null);
      toast({ kind: "success", title: "Role updated", message: "The user's sessions were revoked so the new role applies immediately." });
    } catch (e) {
      toast({ kind: "error", title: "Role change failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function confirmToggleDisable() {
    if (!toggling) return;
    setBusy(true);
    try {
      await api(`/api/owner/users/${toggling.uid}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled: !toggling.disabled }),
      });
      setUsers((prev) => prev.map((u) => (u.uid === toggling.uid ? { ...u, disabled: !u.disabled } : u)));
      setToggling(null);
      toast({ kind: "success", title: toggling.disabled ? "User enabled" : "User disabled" });
    } catch (e) {
      toast({ kind: "error", title: "Update failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/owner/users/${deleting.uid}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.uid !== deleting.uid));
      setDeleting(null);
      toast({ kind: "success", title: "Account deleted", message: "The account can no longer sign in." });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api("/api/owner/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          displayName: form.displayName || undefined,
          role: form.role,
        }),
      });
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

  return (
    <>
      <OwnerPageHeader
        title="Users & roles"
        description="Create HackerAdmin / Site Admin accounts, assign roles, disable access"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New account
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : users.length === 0 ? (
        <EmptyState title="No users" message="Registered users will appear here." />
      ) : (
        <>
          <TableShell>
            <THead>
              <TH>User</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Last sign in</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {users.map((u) => (
                <tr key={u.uid} className="transition-colors hover:bg-white/[0.03]">
                  <TD>
                    <p className="font-semibold text-ivory-50">{u.displayName ?? "—"}</p>
                    <p className="font-mono text-[12px] text-ivory-500">{u.email ?? "no email"}</p>
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1.5">
                      <Select
                        value={u.role}
                        onChange={(e) => setChanging({ user: u, role: e.target.value as Role })}
                        className="h-10 w-[168px] text-[12.5px]"
                        aria-label={`Role for ${u.email}`}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ivory-600">{ROLE_OPTIONS.find((o) => o.value === u.role)?.hint}</span>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex gap-1.5">
                      {u.disabled ? <Badge variant="danger">Disabled</Badge> : <Badge variant="success">Active</Badge>}
                      {!u.emailVerified && <Badge variant="warning">Unverified</Badge>}
                    </div>
                  </TD>
                  <TD className="whitespace-nowrap text-ivory-400/80">
                    {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "Never"}
                  </TD>
                  <TD>
                    <RowActions>
                      <Button variant="ghost" size="sm" onClick={() => setToggling(u)}>
                        {u.disabled ? <><CheckCircle2 className="h-4 w-4" /> Enable</> : <><Ban className="h-4 w-4 text-danger" /> Disable</>}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(u)} aria-label="Delete account">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </RowActions>
                  </TD>
                </tr>
              ))}
            </TBody>
          </TableShell>
          <LoadMore hasMore={pageToken !== null} loading={loadingMore} onLoad={() => load(pageToken, true)} />
        </>
      )}

      {/* -------- Create account -------- */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Create an account"
        description="Provision a staff or member account directly — no signup email required."
      >
        <form onSubmit={createAccount} className="grid gap-4">
          <div>
            <Label htmlFor="ha-name">Display name</Label>
            <Input
              id="ha-name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Ada Lovelace"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="ha-email">Email</Label>
            <Input
              id="ha-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@example.com"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="ha-password">Temporary password</Label>
            <Input
              id="ha-password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="ha-role">Role</Label>
            <Select id="ha-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </Select>
            <FieldHint>
              Site Admins get the content studio and can add sub-admins. HackerAdmins get this
              operations console.
            </FieldHint>
          </div>
          <div className="flex items-center gap-3 pt-1">
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
        open={Boolean(changing)}
        onClose={() => setChanging(null)}
        onConfirm={confirmRoleChange}
        loading={busy}
        title={`Set role to "${ROLE_LABEL[changing?.role ?? "user"]}"?`}
        message={`${changing?.user.email} will ${roleHint(changing?.role ?? "user")}. Their sessions will be revoked immediately.`}
        confirmLabel="Change role"
        requireTyping={changing?.role === "owner" || changing?.role === "superadmin" ? "CONFIRM" : undefined}
      />

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        onConfirm={confirmToggleDisable}
        loading={busy}
        title={toggling?.disabled ? "Enable this user?" : "Disable this user?"}
        message={toggling?.disabled ? `${toggling?.email} will be able to sign in again.` : `${toggling?.email} will be immediately signed out and blocked from signing in.`}
        confirmLabel={toggling?.disabled ? "Enable user" : "Disable user"}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={`Delete ${deleting?.displayName ?? deleting?.email}?`}
        message="This permanently removes the account, its profile and its credentials. It cannot be undone."
        confirmLabel="Delete account"
        destructive
        requireTyping="DELETE"
      />
    </>
  );
}
