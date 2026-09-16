"use client";

import * as React from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { TableShell, THead, TH, TBody, TD, RowActions } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
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
  role: string;
  createdAt: string;
  lastSignInAt: string;
}

export default function OwnerUsersPage() {
  const [users, setUsers] = React.useState<OwnerUser[]>([]);
  const [pageToken, setPageToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [changing, setChanging] = React.useState<{ user: OwnerUser; role: Role } | null>(null);
  const [toggling, setToggling] = React.useState<OwnerUser | null>(null);
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
  }, [load ]);

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

  return (
    <>
      <OwnerPageHeader title="Users & roles" description="Promote admins, manage owners, disable accounts" />
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
                    <Select
                      value={u.role}
                      onChange={(e) => setChanging({ user: u, role: e.target.value as Role })}
                      className="w-32"
                      aria-label={`Role for ${u.email}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </Select>
                  </TD>
                  <TD>
                    <div className="flex gap-1.5">
                      {u.disabled
                        ? <Badge variant="danger">Disabled</Badge>
                        : <Badge variant="success">Active</Badge>}
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
                    </RowActions>
                  </TD>
                </tr>
              ))}
            </TBody>
          </TableShell>
          <LoadMore hasMore={pageToken !== null} loading={loadingMore} onLoad={() => load(pageToken, true)} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(changing)}
        onClose={() => setChanging(null)}
        onConfirm={confirmRoleChange}
        loading={busy}
        title={`Set role to "${changing?.role}"?`}
        message={`${changing?.user.email} will ${changing?.role === "user" ? "lose all admin access" : changing?.role === "owner" ? "gain FULL owner control including this console" : "gain content admin access"}. Their sessions will be revoked immediately.`}
        confirmLabel="Change role"
        requireTyping={changing?.role === "owner" ? "CONFIRM" : undefined}
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
    </>
  );
}
