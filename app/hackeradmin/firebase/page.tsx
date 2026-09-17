"use client";

import * as React from "react";
import { Database, KeyRound, HardDrive, ShieldCheck, Copy, Check } from "lucide-react";
import { OwnerPageHeader, MaskedValue } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { api } from "@/hooks/use-api";

interface FirebaseInfo {
  configured: boolean;
  projectId: string | null;
  authDomain: string | null;
  storageBucket: string | null;
  appIdMasked: string | null;
  apiKeyMasked: string | null;
  admin: { clientEmailMasked: string | null; keyConfigured: boolean };
  checks: { firestore: string; auth: string; storage: string };
  media: { provider: "cloudinary" | "firebase" | "local"; cloudName?: string; rootFolder?: string };
}

export default function OwnerFirebasePage() {
  const [info, setInfo] = React.useState<FirebaseInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setInfo(await api<FirebaseInfo>("/api/owner/firebase-info"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (error) return (
    <>
      <OwnerPageHeader title="Firebase configuration" description="Connection details (secrets masked)" />
      <ErrorState message={error} onRetry={load} />
    </>
  );
  if (!info) {
    return (
      <>
        <OwnerPageHeader title="Firebase configuration" description="Connection details (secrets masked)" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }

  const rows: { icon: React.ReactNode; label: string; value: string; copyable?: string; copyKey?: string; status?: string }[] = [
    { icon: <Database className="h-4 w-4 text-ivory-500" />, label: "Project ID", value: info.projectId ?? "— not configured —", copyable: info.projectId ?? undefined, copyKey: "project", status: info.checks.firestore },
    { icon: <KeyRound className="h-4 w-4 text-ivory-500" />, label: "Auth domain", value: info.authDomain ?? "— not configured —", copyable: info.authDomain ?? undefined, copyKey: "domain", status: info.checks.auth },
    { icon: <HardDrive className="h-4 w-4 text-ivory-500" />, label: "Storage bucket", value: info.storageBucket ?? "— not configured —", copyable: info.storageBucket ?? undefined, copyKey: "bucket", status: info.checks.storage },
    { icon: <ShieldCheck className="h-4 w-4 text-ivory-500" />, label: "Web API key", value: info.apiKeyMasked ?? "—", status: undefined },
    { icon: <ShieldCheck className="h-4 w-4 text-ivory-500" />, label: "Web App ID", value: info.appIdMasked ?? "—", status: undefined },
  ];

  return (
    <>
      <OwnerPageHeader title="Firebase configuration" description="Safe connection details — secrets are never rendered" />

      <Card>
        <CardHeader>
          <CardTitle>Web app configuration</CardTitle>
          <CardDescription>
            These public values identify your Firebase project in the browser. The Admin private key is{" "}
            <strong>never</strong> shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-2 rounded-sm border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                {r.icon}
                <div>
                  <p className="text-[13px] font-semibold text-ivory-400/80">{r.label}</p>
                  <div className="mt-1"><MaskedValue value={r.value} /></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.status && (
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${r.status === "operational" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
                    {r.status}
                  </span>
                )}
                {r.copyable && (
                  <Button variant="ghost" size="sm" onClick={() => copy(r.copyable!, r.copyKey!)}>
                    {copied === r.copyKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === r.copyKey ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Media storage</CardTitle>
          <CardDescription>Where uploads from the studio and the owner section are stored</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-col gap-2 rounded-sm border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="h-4 w-4 text-ivory-500" />
              <div>
                <p className="text-[13px] font-semibold text-ivory-400/80">Active backend</p>
                <div className="mt-1">
                  <MaskedValue
                    value={
                      info.media.provider === "cloudinary"
                        ? `Cloudinary${info.media.cloudName ? ` · ${info.media.cloudName}` : ""}`
                        : info.media.provider === "firebase"
                          ? "Firebase Storage"
                          : "Embedded disk storage"
                    }
                  />
                </div>
              </div>
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[12px] font-bold ${info.media.provider === "local" ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>
              {info.media.provider}
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-sm border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-ivory-400/80">Cloudinary root folder</p>
              <div className="mt-1"><MaskedValue value={info.media.rootFolder ?? "— not configured —"} /></div>
            </div>
            <span className="w-fit rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-bold text-ivory-300">
              {info.media.provider === "cloudinary" ? "browser-direct uploads on" : "set CLOUDINARY_* to enable"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Admin SDK (server-only)</CardTitle>
          <CardDescription>Used by API routes. Credentials live in server environment variables.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-col gap-2 rounded-sm border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-ivory-400/80">Service account</p>
              <div className="mt-1"><MaskedValue value={info.admin.clientEmailMasked ?? "— not configured —"} /></div>
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[12px] font-bold ${info.admin.keyConfigured ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
              {info.admin.keyConfigured ? "Private key present" : "Private key missing"}
            </span>
          </div>
          <p className="rounded-sm bg-ink-900 p-4 text-[13px] leading-relaxed text-white/70">
            To rotate credentials: create a new service-account key in the Firebase console, update{" "}
            <code className="text-emerald-300">FIREBASE_PRIVATE_KEY</code> in Vercel environment variables, redeploy,
            then delete the old key. Never paste the private key into any browser UI.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
