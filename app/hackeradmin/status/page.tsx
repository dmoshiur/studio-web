"use client";

import * as React from "react";
import { Power, AlertOctagon } from "lucide-react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea, Label, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import type { MaintenanceState } from "@/types";

export default function OwnerStatusPage() {
  const [state, setState] = React.useState<MaintenanceState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmToggle, setConfirmToggle] = React.useState<null | { enable: boolean }>(null);
  const [confirmLock, setConfirmLock] = React.useState<null | { enable: boolean }>(null);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      setState(await api<MaintenanceState>("/api/owner/maintenance"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function save(next: MaintenanceState) {
    setSaving(true);
    try {
      const saved = await api<MaintenanceState>("/api/owner/maintenance", {
        method: "PUT",
        body: JSON.stringify({
          enabled: next.enabled,
          emergencyLock: next.emergencyLock,
          title: next.title,
          message: next.message,
          expectedReturn: next.expectedReturn ?? "",
          imageUrl: next.imageUrl ?? "",
        }),
      });
      setState(saved);
      toast({
        kind: "success",
        title: saved.enabled || saved.emergencyLock ? "Site taken offline" : "Site is online",
        message: "Changes take effect within seconds.",
      });
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
      setConfirmToggle(null);
      setConfirmLock(null);
    }
  }

  if (error) return (
    <>
      <OwnerPageHeader title="Site status" description="Maintenance mode and emergency lock" />
      <ErrorState message={error} onRetry={load} />
    </>
  );
  if (!state) {
    return (
      <>
        <OwnerPageHeader title="Site status" description="Maintenance mode and emergency lock" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }

  const offline = state.enabled || state.emergencyLock;

  return (
    <>
      <OwnerPageHeader title="Site status" description="Take the public site offline without redeploying" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={offline ? "border-red-200" : "border-emerald-200"}>
          <CardHeader>
            <CardTitle>Maintenance mode</CardTitle>
            <CardDescription>
              Public visitors see a maintenance page. /admin, /hackeradmin, auth and health endpoints stay up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-sm bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-sm ${offline ? "border border-red-400/30 bg-red-400/10 text-red-300" : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"}`}>
                  <Power className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-serif text-[1.35rem] text-ivory-50">
                    {state.enabled ? "MAINTENANCE" : "ONLINE"}
                  </p>
                  <p className="text-[13px] text-ivory-400/80">
                    {state.enabled ? "Visitors are redirected" : "Serving public traffic"}
                  </p>
                </div>
              </div>
              <Switch
                checked={state.enabled}
                onCheckedChange={(v) => setConfirmToggle({ enable: v })}
                label="Toggle maintenance mode"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-300 bg-red-400/[0.07]">
          <CardHeader>
            <CardTitle className="text-red-700">Emergency lock</CardTitle>
            <CardDescription>
              Kill switch for incidents. Overrides everything public. Owner-only, always audit-logged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-sm bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-red-600 text-white">
                  <AlertOctagon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-serif text-[1.35rem] text-ivory-50">
                    {state.emergencyLock ? "LOCKED" : "OFF"}
                  </p>
                  <p className="text-[13px] text-ivory-400/80">Requires typed confirmation</p>
                </div>
              </div>
              <Switch
                checked={state.emergencyLock}
                onCheckedChange={(v) => setConfirmLock({ enable: v })}
                label="Toggle emergency lock"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Maintenance page content</CardTitle>
          <CardDescription>What visitors see while the site is offline</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>Title</Label>
            <Input value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={3} value={state.message} onChange={(e) => setState({ ...state, message: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Expected return (optional)</Label>
              <Input value={state.expectedReturn ?? ""} onChange={(e) => setState({ ...state, expectedReturn: e.target.value })} placeholder="Back around 6 PM UTC" />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={state.imageUrl ?? ""} onChange={(e) => setState({ ...state, imageUrl: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ivory-500">
              Last updated: {new Date(state.updatedAt).toLocaleString()}
              {state.updatedBy ? ` by ${state.updatedBy.slice(0, 8)}…` : ""}
            </p>
            <Button onClick={() => void save(state)} loading={saving}>Save content</Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmToggle)}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => state && void save({ ...state, enabled: confirmToggle!.enable })}
        loading={saving}
        title={confirmToggle?.enable ? "Enable maintenance mode?" : "Bring the site back online?"}
        message={
          confirmToggle?.enable
            ? "Public visitors will immediately see the maintenance page instead of the site."
            : "Public traffic will be restored immediately."
        }
        confirmLabel={confirmToggle?.enable ? "Enable maintenance" : "Go online"}
      />

      <ConfirmDialog
        open={Boolean(confirmLock)}
        onClose={() => setConfirmLock(null)}
        onConfirm={() => state && void save({ ...state, emergencyLock: confirmLock!.enable })}
        loading={saving}
        title={confirmLock?.enable ? "ENGAGE emergency lock?" : "Release emergency lock?"}
        message={
          confirmLock?.enable
            ? "This is the incident kill switch. The public site will be fully locked until you release it."
            : "The emergency lock will be released. Maintenance mode setting still applies."
        }
        confirmLabel={confirmLock?.enable ? "Engage lock" : "Release lock"}
        requireTyping="CONFIRM"
      />
    </>
  );
}
