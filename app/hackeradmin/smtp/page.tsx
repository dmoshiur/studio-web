"use client";

import * as React from "react";
import { MailCheck, Send } from "lucide-react";
import { OwnerPageHeader, SecretField } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";

interface SmtpStatus {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  fromEmail: string | null;
  fromName: string | null;
  secure: boolean;
  lastTestAt: string | null;
  lastTestResult: string | null;
}

export default function OwnerSmtpPage() {
  const [status, setStatus] = React.useState<SmtpStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    host: "", port: 587, secure: false, user: "", password: "",
    fromEmail: "", fromName: "", replyTo: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      const s = await api<SmtpStatus>("/api/owner/smtp");
      setStatus(s);
      setForm((f) => ({
        ...f,
        host: s.host ?? "",
        port: s.port ?? 587,
        user: s.user ?? "",
        fromEmail: s.fromEmail ?? "",
        fromName: s.fromName ?? "",
        secure: s.secure,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function save() {
    if (!form.password) {
      toast({ kind: "error", title: "Password required", message: "Enter the SMTP password to confirm this change. It is never displayed again." });
      return;
    }
    setSaving(true);
    try {
      const res = await api<SmtpStatus & { message?: string }>("/api/owner/smtp", {
        method: "PUT",
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      setStatus(res);
      setForm((f) => ({ ...f, password: "" }));
      toast({ kind: "success", title: "SMTP settings saved", message: res.message });
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testEmail.includes("@")) {
      toast({ kind: "error", title: "Enter a valid recipient email" });
      return;
    }
    setTesting(true);
    try {
      await api("/api/owner/smtp/test", { method: "POST", body: JSON.stringify({ to: testEmail }) });
      toast({ kind: "success", title: "Test email sent", message: `Check ${testEmail} shortly.` });
      void load();
    } catch (e) {
      toast({ kind: "error", title: "Test failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setTesting(false);
    }
  }

  if (error) return (
    <>
      <OwnerPageHeader title="Email / SMTP" description="Transactional email configuration" />
      <ErrorState message={error} onRetry={load} />
    </>
  );
  if (!status) {
    return (
      <>
        <OwnerPageHeader title="Email / SMTP" description="Transactional email configuration" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }

  return (
    <>
      <OwnerPageHeader
        title="Email / SMTP"
        description="Transactional email for contact notifications and system mail"
        action={
          status.configured
            ? <Badge variant="success">Configured</Badge>
            : <Badge variant="danger">Not configured</Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>
              Credentials are stored in <strong>server environment variables</strong> (Vercel), not in the
              database. Saving here records display metadata and verifies your input — it never reveals the
              stored password.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>SMTP host</Label>
              <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.example.com" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Port</Label>
                <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} autoComplete="off" />
              </div>
              <div className="flex items-end justify-between pb-2.5">
                <Label className="mb-0">SSL/TLS</Label>
                <Switch checked={form.secure} onCheckedChange={(v) => setForm({ ...form, secure: v })} label="SSL/TLS" />
              </div>
            </div>
            <div>
              <Label>Username</Label>
              <Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="no-reply@example.com" autoComplete="off" />
            </div>
            <div className="sm:col-span-2">
              <SecretField label="SMTP password" hint="Write-only. Enter to update credentials in your deployment; the stored value is never shown.">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </SecretField>
            </div>
            <div>
              <Label>From email</Label>
              <Input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="no-reply@example.com" autoComplete="off" />
            </div>
            <div>
              <Label>From name</Label>
              <Input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="ManUp" autoComplete="off" />
            </div>
            <div className="sm:col-span-2">
              <Label>Reply-to (optional)</Label>
              <Input value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} placeholder="support@example.com" autoComplete="off" />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={save} loading={saving}>Save SMTP settings</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Row label="Host" value={status.host ?? "—"} />
              <Row label="Port" value={status.port ? `${status.port}${status.secure ? " (SSL)" : ""}` : "—"} />
              <Row label="User" value={status.user ?? "—"} />
              <Row label="From" value={status.fromEmail ? `${status.fromName ?? ""} <${status.fromEmail}>` : "—"} />
              <Row label="Last test" value={status.lastTestAt ? new Date(status.lastTestAt).toLocaleString() : "Never"} />
              {status.lastTestResult && <Row label="Result" value={status.lastTestResult} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send test email</CardTitle>
              <CardDescription>Rate-limited to prevent abuse</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label>Recipient</Label>
                <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button variant="secondary" onClick={sendTest} loading={testing} disabled={!status.configured}>
                <Send /> Send test
              </Button>
              {!status.configured && (
                <p className="flex gap-2 text-[13px] text-amber-700">
                  <MailCheck className="h-4 w-4 shrink-0" />
                  Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM_EMAIL in Vercel first.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ink-400">{label}</dt>
      <dd className="break-all text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}
