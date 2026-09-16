"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { OwnerPageHeader } from "@/components/hackeradmin/owner-ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea, Label, Select, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { CoverInput } from "@/components/admin/cover-input";
import { publicSettingsSchema } from "@/lib/validation/schemas";
import { api } from "@/hooks/use-api";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { PublicSiteSettings } from "@/types";

type FormValues = z.infer<typeof publicSettingsSchema>;

const TABS = [
  { id: "general", label: "General" },
  { id: "homepage", label: "Homepage" },
  { id: "seo", label: "SEO" },
  { id: "social", label: "Social" },
  { id: "appearance", label: "Appearance" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function OwnerSettingsPage() {
  const [tab, setTab] = React.useState<TabId>("general");
  const [initial, setInitial] = React.useState<PublicSiteSettings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      setInitial(await api<PublicSiteSettings>("/api/owner/settings"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load ]);

  if (error) return (
    <>
      <OwnerPageHeader title="Site settings" description="Global branding, SEO and homepage content" />
      <ErrorState message={error} onRetry={load} />
    </>
  );
  if (!initial) {
    return (
      <>
        <OwnerPageHeader title="Site settings" description="Global branding, SEO and homepage content" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }

  return (
    <>
      <OwnerPageHeader title="Site settings" description="Changes go live within seconds (cached pages revalidate)" />
      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <SettingsForm key={tab + initial.updatedAt} initial={initial} tab={tab} onSaved={(s) => { setInitial(s); toast({ kind: "success", title: "Settings saved" }); }} />
    </>
  );
}

function SettingsForm({
  initial, tab, onSaved,
}: {
  initial: PublicSiteSettings;
  tab: TabId;
  onSaved: (s: PublicSiteSettings) => void;
}) {
  const { toast } = useToast();
  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(publicSettingsSchema),
    defaultValues: {
      siteName: initial.siteName,
      tagline: initial.tagline,
      logoUrl: initial.logoUrl ?? "",
      faviconUrl: initial.faviconUrl ?? "",
      contactEmail: initial.contactEmail,
      phone: initial.phone ?? "",
      address: initial.address ?? "",
      timezone: initial.timezone,
      seo: {
        metaTitle: initial.seo.metaTitle,
        metaDescription: initial.seo.metaDescription,
        keywords: initial.seo.keywords ?? "",
        ogImage: initial.seo.ogImage ?? "",
        twitterCard: initial.seo.twitterCard,
      },
      social: initial.social ?? {},
      appearance: initial.appearance,
      homepage: {
        heroBadge: initial.homepage.heroBadge ?? "",
        heroTitle: initial.homepage.heroTitle,
        heroSubtitle: initial.homepage.heroSubtitle,
        heroCtaPrimary: initial.homepage.heroCtaPrimary,
        heroCtaSecondary: initial.homepage.heroCtaSecondary,
        heroImage: initial.homepage.heroImage ?? "",
        eventDateISO: initial.homepage.eventDateISO ?? "",
        eventVenue: initial.homepage.eventVenue ?? "",
        showCountdown: initial.homepage.showCountdown,
        aboutTitle: initial.homepage.aboutTitle,
        aboutBody: initial.homepage.aboutBody,
        aboutImage: initial.homepage.aboutImage ?? "",
        aboutStats: initial.homepage.aboutStats ?? [],
      },
    },
  });

  const { fields: statFields, append: appendStat, remove: removeStat } = useFieldArray({ control, name: "homepage.aboutStats" });

  async function onSubmit(values: FormValues) {
    try {
      const saved = await api<PublicSiteSettings>("/api/owner/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      onSaved(saved);
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {tab === "general" && (
        <Card>
          <CardHeader><CardTitle>General</CardTitle><CardDescription>Identity and contact details</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Site name *</Label><Input {...register("siteName")} /><Err msg={errors.siteName?.message} /></div>
            <div><Label>Contact email *</Label><Input {...register("contactEmail")} /><Err msg={errors.contactEmail?.message} /></div>
            <div className="sm:col-span-2"><Label>Tagline</Label><Input {...register("tagline")} /></div>
            <div><Label>Phone</Label><Input {...register("phone")} /></div>
            <div><Label>Timezone</Label><Input {...register("timezone")} placeholder="UTC" /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input {...register("address")} /></div>
            <div>
              <Controller name="logoUrl" control={control} render={({ field }) => <CoverInput label="Logo" value={field.value ?? ""} onChange={field.onChange} />} />
            </div>
            <div>
              <Controller name="faviconUrl" control={control} render={({ field }) => <CoverInput label="Favicon" value={field.value ?? ""} onChange={field.onChange} />} />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "homepage" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle>Hero</CardTitle><CardDescription>First screen of the homepage</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Badge</Label><Input {...register("homepage.heroBadge")} placeholder="Annual Tech Conference" /></div>
              <div><Label>Event venue</Label><Input {...register("homepage.eventVenue")} placeholder="Mardavall Hotel, New York" /></div>
              <div className="sm:col-span-2"><Label>Title *</Label><Input {...register("homepage.heroTitle")} /><Err msg={errors.homepage?.heroTitle?.message} /></div>
              <div className="sm:col-span-2"><Label>Subtitle</Label><Textarea rows={3} {...register("homepage.heroSubtitle")} /></div>
              <div><Label>Primary CTA label</Label><Input {...register("homepage.heroCtaPrimary.label")} /></div>
              <div><Label>Primary CTA link</Label><Input {...register("homepage.heroCtaPrimary.href")} /></div>
              <div><Label>Secondary CTA label</Label><Input {...register("homepage.heroCtaSecondary.label")} /></div>
              <div><Label>Secondary CTA link</Label><Input {...register("homepage.heroCtaSecondary.href")} /></div>
              <div>
                <Controller name="homepage.heroImage" control={control} render={({ field }) => <CoverInput label="Hero image" value={field.value ?? ""} onChange={field.onChange} />} />
              </div>
              <div className="grid content-start gap-4">
                <div><Label>Main event date (for countdown)</Label><Input type="datetime-local" {...register("homepage.eventDateISO")} /></div>
                <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
                  <span className="text-sm font-semibold text-ink-700">Show countdown</span>
                  <Controller name="homepage.showCountdown" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} label="Show countdown" />} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>About section</CardTitle><CardDescription>Homepage about block</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Title</Label><Input {...register("homepage.aboutTitle")} /></div>
              <div className="sm:col-span-2"><Label>Body</Label><Textarea rows={4} {...register("homepage.aboutBody")} /></div>
              <div className="sm:col-span-2">
                <Controller name="homepage.aboutImage" control={control} render={({ field }) => <CoverInput label="About image" value={field.value ?? ""} onChange={field.onChange} />} />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Stats</Label>
                  <Button type="button" variant="secondary" size="sm" onClick={() => appendStat({ value: "", label: "" })}>
                    <Plus /> Add stat
                  </Button>
                </div>
                <div className="grid gap-2">
                  {statFields.map((f, i) => (
                    <div key={f.id} className="flex gap-2">
                      <Input {...register(`homepage.aboutStats.${i}.value`)} placeholder="2K+" className="w-28" />
                      <Input {...register(`homepage.aboutStats.${i}.label`)} placeholder="Attendees" className="flex-1" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStat(i)} aria-label="Remove stat">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  ))}
                  {statFields.length === 0 && <p className="text-sm text-ink-400">No stats yet.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "seo" && (
        <Card>
          <CardHeader><CardTitle>SEO</CardTitle><CardDescription>Default metadata for the whole site</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Meta title *</Label><Input {...register("seo.metaTitle")} /></div>
            <div>
              <Label>Twitter card</Label>
              <Select {...register("seo.twitterCard")}>
                <option value="summary_large_image">Large image</option>
                <option value="summary">Summary</option>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Meta description *</Label><Textarea rows={3} {...register("seo.metaDescription")} /></div>
            <div className="sm:col-span-2"><Label>Keywords</Label><Input {...register("seo.keywords")} /></div>
            <div className="sm:col-span-2">
              <Controller name="seo.ogImage" control={control} render={({ field }) => <CoverInput label="OG image" value={field.value ?? ""} onChange={field.onChange} />} />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "social" && (
        <Card>
          <CardHeader><CardTitle>Social profiles</CardTitle><CardDescription>URLs for each network (footer icons are managed under Admin → Navigation)</CardDescription></CardHeader>
          <CardContent>
            <SocialEditor register={register} />
          </CardContent>
        </Card>
      )}

      {tab === "appearance" && (
        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Brand colors</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Primary color</Label>
              <div className="flex gap-2">
                <Input type="color" {...register("appearance.primaryColor")} className="h-11 w-14 cursor-pointer p-1.5" aria-label="Primary color picker" />
                <Input {...register("appearance.primaryColor")} className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Secondary color</Label>
              <div className="flex gap-2">
                <Input type="color" {...register("appearance.secondaryColor")} className="h-11 w-14 cursor-pointer p-1.5" aria-label="Secondary color picker" />
                <Input {...register("appearance.secondaryColor")} className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Theme</Label>
              <Select {...register("appearance.theme")}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} className="shadow-pop">
          Save {TABS.find((t) => t.id === tab)?.label} settings
        </Button>
      </div>
    </form>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">{msg}</p>;
}

const SOCIAL_NETWORKS = ["facebook", "instagram", "youtube", "linkedin", "twitter", "whatsapp"];

function SocialEditor({ register }: { register: ReturnType<typeof useForm<FormValues>>["register"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SOCIAL_NETWORKS.map((n) => (
        <div key={n}>
          <Label className="capitalize">{n}</Label>
          <Input {...register(`social.${n}`)} placeholder={`https://${n}.com/…`} />
        </div>
      ))}
    </div>
  );
}
