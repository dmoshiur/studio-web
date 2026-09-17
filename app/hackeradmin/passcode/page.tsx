"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, RefreshCw, Timer, ShieldCheck, Lock, Pencil } from "lucide-react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";

interface PasscodeStatus {
  exists: boolean;
  mode: "auto" | "manual";
  custom: boolean;
  valid: boolean;
  expiresAt: string | null;
  issuedAt: string | null;
  lastRotatedAt: string | null;
  lastRotationResult: "emailed" | "email_failed" | "email_unconfigured" | "manual_set" | null;
  lastEmailSentAt: string | null;
  emailRecipient: string;
  smtpConfigured: boolean;
  lockedUntil: string | null;
  sessionEpoch: number;
}

type PendingAction =
  | { kind: "rotate" }
  | { kind: "resume-auto" }
  | { kind: "custom"; passphrase: string }
  | null;

export default function PasscodeManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<PasscodeStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAction>(null);
  const [confirmCode, setConfirmCode] = React.useState("");
  const [customPass, setCustomPass] = React.useState("");
  const [customPass2, setCustomPass2] = React.useState("");

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setStatus(await api<PasscodeStatus>("/api/owner/passcode"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // live countdown refresh
  React.useEffect(() => {
    const t = setInterval(() => setStatus((s) => (s ? { ...s } : s)), 30_000);
    return () => clearInterval(t);
  }, []);

  async function execute(action: PendingAction) {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "custom") {
        const res = await api<{ ok: boolean; message?: string; note?: string }>("/api/owner/passcode", {
          method: "PATCH",
          body: JSON.stringify({ passphrase: action.passphrase, confirmPasscode: confirmCode }),
        });
        toast({ kind: "success", title: "Custom passphrase active", message: res.note ?? res.message });
      } else {
        const res = await api<{ ok: boolean; message?: string; note?: string }>("/api/owner/passcode", {
          method: "POST",
          body: JSON.stringify({ action: action.kind, confirmPasscode: confirmCode }),
        });
        toast({ kind: "success", title: action.kind === "rotate" ? "Passcode rotated" : "Automatic rotation resumed", message: res.note ?? res.message });
      }
      setPending(null);
      setConfirmCode("");
      setCustomPass("");
      setCustomPass2("");
      // Rotating/custom-setting revokes THIS session — return to the gate.
      router.push("/hackeradmin");
      router.refresh();
    } catch (e) {
      toast({ kind: "error", title: "Action failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <>
        <OwnerPageHeader title="Passcode & Access" description="Rotating passcode security for this panel" />
        <ErrorState message={error} onRetry={load} />
      </>
    );

  if (!status)
    return (
      <>
        <OwnerPageHeader title="Passcode & Access" description="Rotating passcode security for this panel" />
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </>
    );

  const expiresMs = status.expiresAt ? new Date(status.expiresAt).getTime() - Date.now() : null;
  const minutesLeft = expiresMs !== null ? Math.max(0, Math.round(expiresMs / 60000)) : null;

  return (
    <>
      <OwnerPageHeader
        title="Passcode & Access"
        description="The passcode rotates every hour and is delivered exclusively to the registered security email."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gold-400" /> Current status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-[13.5px]">
            <Row label="State">
              {status.valid ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="danger">No valid passcode</Badge>
              )}
              {status.lockedUntil && <Badge variant="danger">Entry locked</Badge>}
            </Row>
            <Row label="Mode">
              {status.mode === "auto" ? (
                <span className="inline-flex items-center gap-1.5 text-ivory-100">
                  <Timer className="h-3.5 w-3.5 text-gold-400" /> Automatic hourly rotation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <Pencil className="h-3.5 w-3.5" /> Manual / controlled{status.custom ? " (custom passphrase)" : ""}
                </span>
              )}
            </Row>
            <Row label="Expires">
              {status.expiresAt && status.valid
                ? `${new Date(status.expiresAt).toLocaleString()} (${minutesLeft} min left)`
                : "—"}
            </Row>
            <Row label="Issued">{status.issuedAt ? new Date(status.issuedAt).toLocaleString() : "—"}</Row>
            <Row label="Last rotation">
              {status.lastRotatedAt
                ? `${new Date(status.lastRotatedAt).toLocaleString()} — ${resultLabel(status.lastRotationResult)}`
                : "never"}
            </Row>
            <Row label="Last email sent">
              {status.lastEmailSentAt ? new Date(status.lastEmailSentAt).toLocaleString() : "never"}
            </Row>
            <Row label="Delivery">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gold-400" />
                {status.smtpConfigured ? "SMTP configured" : "SMTP NOT configured"}
              </span>
            </Row>
            <Row label="Recipient">
              <span className="font-mono text-[12.5px] text-ivory-200">{status.emailRecipient}</span>
            </Row>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Rotate now</CardTitle>
              <CardDescription>
                Generates a fresh passcode immediately and emails it to the security recipient.
                This panel session ends — you will sign back in with the new code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setPending({ kind: "rotate" })} disabled={!status.valid}>
                <RefreshCw className="h-4 w-4" /> Rotate passcode now
              </Button>
              {!status.valid && (
                <p className="mt-3 text-[12.5px] text-amber-300">
                  Rotation is unavailable while no valid passcode exists or email delivery is down.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automatic rotation</CardTitle>
              <CardDescription>
                {status.mode === "auto"
                  ? "Hourly rotation is active. A new passcode is emailed automatically when the current one expires."
                  : "Automatic rotation is paused (manual mode). Resume it to return to hourly emailed passcodes."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.mode === "auto" ? (
                <Badge variant="success">Automatic rotation active</Badge>
              ) : (
                <Button variant="outline" onClick={() => setPending({ kind: "resume-auto" })}>
                  <Timer className="h-4 w-4" /> Resume automatic rotation
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gold-400" /> Custom passphrase (controlled mode)
          </CardTitle>
          <CardDescription>
            Sets your own passphrase and pauses hourly rotation until you resume it. A confirmation
            email (without the passphrase) is sent to the security recipient. Minimum 10 characters,
            letters and numbers required.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:max-w-xl">
          <div>
            <Label htmlFor="cp1">New passphrase</Label>
            <Input id="cp1" type="password" autoComplete="new-password" value={customPass} onChange={(e) => setCustomPass(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cp2">Repeat passphrase</Label>
            <Input id="cp2" type="password" autoComplete="new-password" value={customPass2} onChange={(e) => setCustomPass2(e.target.value)} />
          </div>
          {customPass2 && customPass !== customPass2 && (
            <p className="text-[12.5px] text-red-300">Passphrases do not match.</p>
          )}
          <div>
            <Button
              variant="outline"
              disabled={customPass.length < 10 || customPass !== customPass2 || !status.valid}
              onClick={() => setPending({ kind: "custom", passphrase: customPass })}
            >
              <Pencil className="h-4 w-4" /> Set custom passphrase
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-start gap-3 border border-gold-500/20 bg-gold-500/[0.06] p-5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
        <p className="text-[12.5px] leading-relaxed text-ivory-400">
          Security model: the passcode is generated with a cryptographic RNG, stored only as a salted
          scrypt hash, verified in constant time, rate-limited per IP and globally locked after
          repeated failures. It is delivered only to <span className="font-mono text-gold-200">{status.emailRecipient}</span> and
          never appears in logs, URLs or API responses. Manual actions require re-entering the
          current passcode.
        </p>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => {
          setPending(null);
          setConfirmCode("");
        }}
        onConfirm={() => void execute(pending)}
        loading={busy}
        title={
          pending?.kind === "rotate"
            ? "Rotate the passcode now?"
            : pending?.kind === "resume-auto"
              ? "Resume automatic hourly rotation?"
              : "Activate the custom passphrase?"
        }
        message={
          pending?.kind === "custom"
            ? "Automatic rotation will pause and this session will end. Enter the CURRENT passcode to confirm."
            : "A new passcode will be emailed to the security recipient and this session will end. Enter the CURRENT passcode to confirm."
        }
        confirmLabel={pending?.kind === "custom" ? "Set passphrase" : pending?.kind === "resume-auto" ? "Resume rotation" : "Rotate now"}
      >
        <div className="grid gap-2">
          <Label htmlFor="confirm-code">Current passcode (re-authentication)</Label>
          <Input
            id="confirm-code"
            type="password"
            autoComplete="off"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            disabled={busy}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3 border-b border-white/[0.06] pb-2.5 last:border-0 last:pb-0">
      <p className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ivory-500">{label}</p>
      <div className="text-ivory-200">{children}</div>
    </div>
  );
}

function resultLabel(r: PasscodeStatus["lastRotationResult"]): string {
  switch (r) {
    case "emailed":
      return "emailed to security recipient";
    case "email_failed":
      return "blocked — email delivery failed";
    case "email_unconfigured":
      return "blocked — SMTP not configured";
    case "manual_set":
      return "custom passphrase set";
    default:
      return "unknown";
  }
}
