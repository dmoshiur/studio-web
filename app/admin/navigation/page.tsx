"use client";

import * as React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import type { NavLink, NavigationDoc, SocialLink } from "@/types";

export default function AdminNavigationPage() {
  const [header, setHeader] = React.useState<NavigationDoc | null>(null);
  const [footer, setFooter] = React.useState<NavigationDoc | null>(null);
  const [socials, setSocials] = React.useState<SocialLink[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [socialDraft, setSocialDraft] = React.useState<{ id?: string; label: string; href: string; icon: string } | null>(null);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      const [h, f, s] = await Promise.all([
        api<NavigationDoc>("/api/admin/navigation?id=header"),
        api<NavigationDoc>("/api/admin/navigation?id=footer"),
        api<{ items: SocialLink[] }>("/api/admin/social-links"),
      ]);
      setHeader(h);
      setFooter(f);
      setSocials(s.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  async function saveNav(id: "header" | "footer", links: NavLink[]) {
    setSaving(id);
    try {
      const saved = await api<NavigationDoc>("/api/admin/navigation", {
        method: "PUT",
        body: JSON.stringify({ id, links }),
      });
      if (id === "header") setHeader(saved);
      else setFooter(saved);
      toast({ kind: "success", title: `${id === "header" ? "Header" : "Footer"} navigation saved` });
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(null);
    }
  }

  async function saveSocial() {
    if (!socialDraft || !socialDraft.label.trim() || !socialDraft.href.trim()) return;
    setSaving("social");
    try {
      await api("/api/admin/social-links", { method: "POST", body: JSON.stringify(socialDraft) });
      setSocialDraft(null);
      const s = await api<{ items: SocialLink[] }>("/api/admin/social-links");
      setSocials(s.items);
      toast({ kind: "success", title: "Social link saved" });
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(null);
    }
  }

  async function deleteSocial(id: string) {
    try {
      await api(`/api/admin/social-links/${id}`, { method: "DELETE" });
      setSocials((prev) => (prev ?? []).filter((s) => s.id !== id));
      toast({ kind: "success", title: "Social link deleted" });
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!header || !footer || !socials) {
    return (
      <>
        <PageHeader title="Navigation" description="Header, footer and social links" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Navigation" description="Control the header, footer and social links" />
      <div className="grid gap-6">
        <LinkEditor
          title="Header navigation"
          description="Main menu shown on every page"
          links={header.links}
          onChange={(links) => setHeader({ ...header, links })}
          onSave={(links) => saveNav("header", links)}
          saving={saving === "header"}
        />
        <LinkEditor
          title="Footer navigation"
          description="Secondary links in the site footer"
          links={footer.links}
          onChange={(links) => setFooter({ ...footer, links })}
          onSave={(links) => saveNav("footer", links)}
          saving={saving === "footer"}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Social links</CardTitle>
                <CardDescription>Shown in the footer with icons</CardDescription>
              </div>
              <Button size="sm" onClick={() => setSocialDraft({ label: "", href: "", icon: "globe" })}>
                <Plus /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {socials.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-400">No social links yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {socials.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{s.label}</p>
                      <p className="truncate text-[13px] text-ink-400">{s.href} · icon: {s.icon}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => setSocialDraft({ id: s.id, label: s.label, href: s.href, icon: s.icon })}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="iconSm" aria-label={`Delete ${s.label}`} onClick={() => void deleteSocial(s.id)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(socialDraft)}
        onClose={() => setSocialDraft(null)}
        title={socialDraft?.id ? "Edit social link" : "Add social link"}
      >
        {socialDraft && (
          <div className="grid gap-3">
            <div>
              <Label>Label</Label>
              <Input value={socialDraft.label} onChange={(e) => setSocialDraft({ ...socialDraft, label: e.target.value })} placeholder="Instagram" />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={socialDraft.href} onChange={(e) => setSocialDraft({ ...socialDraft, href: e.target.value })} placeholder="https://instagram.com/…" />
            </div>
            <div>
              <Label>Icon (facebook, instagram, youtube, linkedin, twitter, globe)</Label>
              <Input value={socialDraft.icon} onChange={(e) => setSocialDraft({ ...socialDraft, icon: e.target.value })} placeholder="instagram" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSocialDraft(null)}>Cancel</Button>
              <Button onClick={saveSocial} loading={saving === "social"}>Save</Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function LinkEditor({
  title, description, links, onChange, onSave, saving,
}: {
  title: string;
  description: string;
  links: NavLink[];
  onChange: (links: NavLink[]) => void;
  onSave: (links: NavLink[]) => void;
  saving: boolean;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onChange([...links, { label: "", href: "/" }])}>
            <Plus /> Add link
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {links.length === 0 && <p className="py-2 text-sm text-ink-400">No links yet.</p>}
        {links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-ink-300" />
            <Input
              value={l.label}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...l, label: e.target.value };
                onChange(next);
              }}
              placeholder="Label"
              className="w-44"
              aria-label={`Link ${i + 1} label`}
            />
            <Input
              value={l.href}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...l, href: e.target.value };
                onChange(next);
              }}
              placeholder="/about or https://…"
              className="flex-1"
              aria-label={`Link ${i + 1} URL`}
            />
            <label className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-ink-500">
              <input
                type="checkbox"
                checked={Boolean(l.external)}
                onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...l, external: e.target.checked };
                  onChange(next);
                }}
                className="h-4 w-4 accent-pink-600"
              />
              External
            </label>
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="px-1 text-[10px] text-ink-400 hover:text-ink-800">▲</button>
              <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="px-1 text-[10px] text-ink-400 hover:text-ink-800">▼</button>
            </div>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Remove link"
              onClick={() => onChange(links.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ))}
        <div className="mt-2 flex justify-end">
          <Button onClick={() => onSave(links.filter((l) => l.label.trim() && l.href.trim()))} loading={saving}>
            Save {title.toLowerCase()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
