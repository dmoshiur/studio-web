"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight, BadgeCheck, CalendarDays, Camera, Loader2, LogOut,
  ShieldCheck, Trash2, UserRound,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Badge } from "@/components/ui/badge";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/types";

interface Profile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role: string;
  createdAt: string | null;
  lastSignInAt: string | null;
}

const RESERVATION_BADGE: Record<Reservation["status"], { label: string; variant: "goldSoft" | "successSoft" | "dangerSoft" }> = {
  requested: { label: "Requested", variant: "goldSoft" },
  confirmed: { label: "Confirmed", variant: "successSoft" },
  cancelled: { label: "Cancelled", variant: "dangerSoft" },
};

export function ProfileDashboard({ canAdmin }: { canAdmin: boolean }) {
  const { logout } = useSession();
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [reservations, setReservations] = React.useState<Reservation[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);

  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [newPw2, setNewPw2] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch("/api/account/profile", { cache: "no-store" }),
        fetch("/api/public/reservations", { cache: "no-store" }),
      ]);
      if (!pRes.ok) throw new Error("Could not load your profile");
      const p = (await pRes.json()) as Profile;
      setProfile(p);
      setName(p.displayName ?? "");
      if (rRes.ok) {
        const r = (await rRes.json()) as { items: Reservation[] };
        setReservations(r.items);
      } else {
        setReservations([]);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your profile");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || savingName) return;
    if (name.trim().length < 2) {
      toast({ kind: "error", title: "Name too short", message: "Your name needs at least 2 characters." });
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as Profile & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setProfile(data);
      toast({ kind: "success", title: "Profile updated", message: "Your name has been saved." });
    } catch (err) {
      toast({ kind: "error", title: "Save failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingName(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ kind: "error", title: "Image too large", message: "Please choose an image under 2 MB." });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/account/avatar", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { photoURL?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setProfile({ ...profile, photoURL: data.photoURL ?? null });
      toast({ kind: "success", title: "Picture updated" });
    } catch (err) {
      toast({ kind: "error", title: "Upload failed", message: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!profile) return;
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      setProfile({ ...profile, photoURL: null });
      toast({ kind: "success", title: "Picture removed" });
    } catch (err) {
      toast({ kind: "error", title: "Could not remove picture", message: err instanceof Error ? err.message : undefined });
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (savingPw) return;
    setPwError(null);
    if (newPw.length < 8) return setPwError("New password needs at least 8 characters.");
    if (!/[A-Za-z]/.test(newPw) || !/\d/.test(newPw)) return setPwError("New password needs letters and numbers.");
    if (newPw !== newPw2) return setPwError("New passwords do not match.");
    setSavingPw(true);
    try {
      // On Firebase deployments the current password is proved by signing in
      // to Firebase Auth (the store login + reset use) and passing a fresh
      // ID token; the embedded backend verifies server-side directly.
      let proofIdToken: string | undefined;
      const { getFirebaseAuth } = await import("@/lib/firebase/client");
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const fbAuth = getFirebaseAuth();
      if (fbAuth && profile?.email) {
        try {
          const cred = await signInWithEmailAndPassword(fbAuth, profile.email, currentPw);
          proofIdToken = await cred.user.getIdToken(true);
        } catch {
          throw new Error("Current password is incorrect");
        }
      }
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw, ...(proofIdToken ? { proofIdToken } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Password change failed");
      setCurrentPw("");
      setNewPw("");
      setNewPw2("");
      toast({ kind: "success", title: "Password changed", message: data.message });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSavingPw(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <div className="border border-red-400/25 bg-red-400/[0.07] p-8 text-center">
          <p className="text-[14px] text-red-200">{loadError}</p>
          <button
            onClick={() => void load()}
            className="mt-5 inline-flex h-11 items-center border border-ink-900 bg-ink-900 px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-gold-700 hover:border-gold-700 disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-[320px] animate-pulse border border-line bg-white" />
          <div className="grid gap-6">
            <div className="h-[220px] animate-pulse border border-line bg-white" />
            <div className="h-[260px] animate-pulse border border-line bg-white" />
          </div>
        </div>
      </Shell>
    );
  }

  const initials = (profile.displayName ?? profile.email ?? "?")
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Shell>
      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        {/* Identity card */}
        <section className="border border-gold-600/25 bg-white p-7 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {profile.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoURL}
                  alt={profile.displayName ?? "Profile picture"}
                  className="h-28 w-28 border border-gold-500/40 object-cover"
                />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center border border-gold-500/40 bg-gold-500/[0.08] font-serif text-[2.2rem] text-gold-300">
                  {initials || <UserRound className="h-10 w-10" />}
                </span>
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-obsidian-950/60">
                  <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
                </span>
              )}
            </div>

            <h1 className="mt-5 font-serif text-[1.6rem] text-ink-900">{profile.displayName ?? "Unnamed"}</h1>
            <p className="mt-1 text-[13px] text-ink-500">{profile.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant={canAdmin ? "gold" : "default"}>{profile.role}</Badge>
              {profile.emailVerified && (
                <Badge variant="successSoft">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>

            <div className="mt-6 grid w-full gap-2">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => void onPickAvatar(e)} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-11 items-center justify-center gap-2 border border-gold-600/50 bg-white font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-700 transition-colors hover:bg-gold-500/[0.08] disabled:opacity-60"
              >
                <Camera className="h-4 w-4" /> {profile.photoURL ? "Change picture" : "Upload picture"}
              </button>
              {profile.photoURL && (
                <button
                  onClick={() => void removeAvatar()}
                  disabled={uploading}
                  className="inline-flex h-11 items-center justify-center gap-2 border border-line bg-white font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-600 transition-colors hover:border-red-500/50 hover:text-red-600 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" /> Remove picture
                </button>
              )}
            </div>

            <dl className="mt-7 w-full space-y-2.5 border-t border-line pt-5 text-left text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Member since</dt>
                <dd className="text-ink-700">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Last sign-in</dt>
                <dd className="text-ink-700">{profile.lastSignInAt ? new Date(profile.lastSignInAt).toLocaleString() : "—"}</dd>
              </div>
            </dl>

            <div className="mt-7 grid w-full gap-2">
              {canAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex h-11 items-center justify-center gap-2 border border-gold-600/40 bg-gold-500/[0.08] font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-700 hover:bg-gold-500/[0.14]"
                >
                  <ShieldCheck className="h-4 w-4" /> Open content studio
                </Link>
              )}
              <button
                onClick={() => void logout()}
                className="inline-flex h-11 items-center justify-center gap-2 border border-line bg-white font-sans text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-600 transition-colors hover:border-red-500/50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </section>

        <div className="grid content-start gap-6">
          {/* Edit profile */}
          <section className="border border-line bg-white p-7 shadow-card">
            <SectionTitle>Profile details</SectionTitle>
            <form onSubmit={(e) => void saveName(e)} className="mt-5 grid gap-4 sm:max-w-lg">
              <div>
                <Label tone="light" htmlFor="name">Full name</Label>
                <Input tone="light" id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={savingName} />
              </div>
              <div>
                <Label tone="light" htmlFor="email">Email</Label>
                <Input tone="light" id="email" value={profile.email ?? ""} disabled readOnly aria-readonly />
                <p className="mt-1.5 text-[11.5px] text-ink-400">
                  The email address is your sign-in identity and cannot be edited here.
                </p>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={savingName || name.trim() === (profile.displayName ?? "")}
                  className="inline-flex h-11 items-center gap-2 bg-ink-900 px-7 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-gold-700 disabled:opacity-50"
                >
                  {savingName && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                </button>
              </div>
            </form>
          </section>

          {/* Reservations */}
          <section className="border border-line bg-white p-7 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <SectionTitle>My reservations</SectionTitle>
              <Link href="/events" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700 hover:text-gold-600">
                Browse events <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {reservations === null ? (
              <p className="mt-5 text-[13px] text-ink-400">Loading reservations…</p>
            ) : reservations.length === 0 ? (
              <p className="mt-5 text-[13px] leading-relaxed text-ink-400">
                You have no seat reservations yet. Choose an event and reserve your seat — confirmed
                reservations appear here.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-line">
                {reservations.map((r) => (
                  <li key={r.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-serif text-[1.05rem] text-ink-800">{r.eventTitle}</p>
                      <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {r.eventStartAt ? new Date(r.eventStartAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date TBC"}
                        {" · "}
                        {r.seats} seat{r.seats > 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant={RESERVATION_BADGE[r.status].variant}>{RESERVATION_BADGE[r.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Password */}
          <section className="border border-line bg-white p-7 shadow-card">
            <SectionTitle>Change password</SectionTitle>
            <form onSubmit={(e) => void changePassword(e)} className="mt-5 grid gap-4 sm:max-w-lg">
              <div>
                <Label tone="light" htmlFor="cpw">Current password</Label>
                <Input tone="light" id="cpw" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} disabled={savingPw} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label tone="light" htmlFor="npw1">New password</Label>
                  <Input tone="light" id="npw1" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} disabled={savingPw} />
                </div>
                <div>
                  <Label tone="light" htmlFor="npw2">Repeat new password</Label>
                  <Input tone="light" id="npw2" type="password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} disabled={savingPw} />
                </div>
              </div>
              <FieldError message={pwError ?? undefined} />
              <div>
                <button
                  type="submit"
                  disabled={savingPw || !currentPw || !newPw}
                  className="inline-flex h-11 items-center gap-2 border border-ink-900 bg-ink-900 px-7 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-gold-700 hover:border-gold-700 disabled:opacity-50"
                >
                  {savingPw && <Loader2 className="h-4 w-4 animate-spin" />} Update password
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper-100 pb-24 pt-[120px]">
      <div className="container">
        <p className="mb-3 font-sans text-[9.5px] font-semibold uppercase tracking-[0.3em] text-gold-700">My Account</p>
        <h1 className="font-serif text-[2.1rem] text-ink-900">Your profile</h1>
        <p className="mt-2 max-w-xl text-[13.5px] text-ink-500">
          Manage your identity, picture, password and seat reservations.
        </p>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={cn("font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700")}>{children}</h2>
  );
}
