"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CoverInput } from "@/components/admin/cover-input";
import { cn } from "@/lib/utils";
import type { OwnerProfile } from "@/types";

type OwnerErrors = Partial<Record<keyof OwnerProfile, string>>;

/**
 * Editor for the owner spotlight — the portrait, name and personal texts
 * shown on the homepage and about page. Shared by Studio → Owner Section
 * and the owner console's Homepage tab.
 */
export function OwnerSectionEditor({
  value,
  onChange,
  errors,
  videoLimitMb = 100,
  variant = "cards",
}: {
  value: OwnerProfile;
  onChange: (next: OwnerProfile) => void;
  errors?: OwnerErrors;
  videoLimitMb?: number;
  /** "cards" for a standalone page, "plain" when nested in another card. */
  variant?: "cards" | "plain";
}) {
  const set = <K extends keyof OwnerProfile>(key: K, next: OwnerProfile[K]) => onChange({ ...value, [key]: next });
  const socials = value.socials ?? [];
  const flat = variant === "plain";

  function Group({
    title,
    description,
    children,
    className = "grid gap-4 sm:grid-cols-2",
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
  }) {
    if (flat) {
      return (
        <section className="border-t border-white/[0.07] pt-6 first:border-0 first:pt-0">
          <h4 className="font-serif text-[1.25rem] text-ivory-50">{title}</h4>
          {description && <p className="mt-1.5 text-[13px] text-ivory-400/80">{description}</p>}
          <div className={cn("mt-5", className)}>{children}</div>
        </section>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className={className}>{children}</CardContent>
      </Card>
    );
  }

  function updateSocial(index: number, patch: Partial<{ label: string; url: string }>) {
    const next = socials.map((social, i) => (i === index ? { ...social, ...patch } : social));
    set("socials", next);
  }

  return (
    <div className="grid gap-6">
      <Group
        title="Owner section"
        description="A portrait, a name and a personal message. Switch the section off to hide it everywhere."
        className="grid gap-3 sm:grid-cols-3"
      >
          <ToggleRow
            label="Show the section"
            hint="Master switch"
            checked={value.enabled}
            onCheckedChange={(checked) => set("enabled", checked)}
          />
          <ToggleRow
            label="On the homepage"
            hint="/"
            checked={value.showOnHome}
            onCheckedChange={(checked) => set("showOnHome", checked)}
            disabled={!value.enabled}
          />
          <ToggleRow
            label="On the about page"
            hint="/about"
            checked={value.showOnAbout}
            onCheckedChange={(checked) => set("showOnAbout", checked)}
            disabled={!value.enabled}
        />
      </Group>

      <Group title="Portrait" description="Upload the owner's photo (or pick one from the media library)">
          <div className="sm:col-span-2">
            <CoverInput
              label="Owner photo"
              value={value.photoUrl ?? ""}
              onChange={(url) => set("photoUrl", url)}
              hint="Leave empty to show a gold monogram with the owner’s initials."
            />
          </div>
          <div>
            <Label>Photo alt text</Label>
            <Input
              value={value.photoAlt ?? ""}
              onChange={(e) => set("photoAlt", e.target.value)}
              placeholder="Portrait of …"
            />
          </div>
          <div>
            <CoverInput
              label="Signature (optional)"
              value={value.signatureUrl ?? ""}
              onChange={(url) => set("signatureUrl", url)}
              hint="A transparent PNG of the handwritten signature."
            />
        </div>
      </Group>

      <Group title="Name & texts" description="The words shown next to the portrait">
          <div>
            <Label>Name *</Label>
            <Input value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Md Moshiur Rahman" />
            <Err msg={errors?.name} />
          </div>
          <div>
            <Label>Role / title</Label>
            <Input value={value.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="Founder & Owner" />
          </div>
          <div>
            <Label>Script accent</Label>
            <Input
              value={value.script ?? ""}
              onChange={(e) => set("script", e.target.value)}
              placeholder="A word from"
            />
          </div>
          <div>
            <Label>Eyebrow</Label>
            <Input
              value={value.eyebrow ?? ""}
              onChange={(e) => set("eyebrow", e.target.value)}
              placeholder="From The Owner"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Section heading *</Label>
            <Input
              value={value.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="The person behind the stage"
            />
            <Err msg={errors?.title} />
          </div>
          <div className="sm:col-span-2">
            <Label>Message</Label>
            <Textarea
              rows={7}
              value={value.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Write the owner's message — leave a blank line between paragraphs."
            />
            <p className="mt-1.5 text-[12px] text-ivory-500">Blank line = new paragraph.</p>
          </div>
          <div className="sm:col-span-2">
            <Label>Pull quote (optional)</Label>
            <Textarea
              rows={2}
              value={value.quote ?? ""}
              onChange={(e) => set("quote", e.target.value)}
              placeholder="A sentence worth remembering."
            />
          </div>
          <div className="sm:col-span-2">
            <CoverInput
              label="Video message (optional)"
              accept="video"
              value={value.videoUrl ?? ""}
              onChange={(url) => set("videoUrl", url)}
              hint={`Videos and audio upload to Cloudinary — up to ${videoLimitMb} MB per file.`}
            />
        </div>
      </Group>

      <Group title="Contact & links" description="How visitors can reach the owner">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={value.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={value.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+1 212 555 0141" />
          </div>
          <div>
            <Label>Button label</Label>
            <Input
              value={value.ctaLabel ?? ""}
              onChange={(e) => set("ctaLabel", e.target.value)}
              placeholder="Get in touch"
            />
          </div>
          <div>
            <Label>Button link</Label>
            <Input
              value={value.ctaHref ?? ""}
              onChange={(e) => set("ctaHref", e.target.value)}
              placeholder="/contact"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Social links</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set("socials", [...socials, { label: "", url: "" }])}
                disabled={socials.length >= 6}
              >
                <Plus /> Add link
              </Button>
            </div>
            <div className="grid gap-2">
              {socials.map((social, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={social.label}
                    onChange={(e) => updateSocial(i, { label: e.target.value })}
                    placeholder="LinkedIn"
                    className="w-40"
                    aria-label={`Social link ${i + 1} label`}
                  />
                  <Input
                    value={social.url}
                    onChange={(e) => updateSocial(i, { url: e.target.value })}
                    placeholder="https://linkedin.com/in/…"
                    className="flex-1"
                    aria-label={`Social link ${i + 1} URL`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => set("socials", socials.filter((_, index) => index !== i))}
                    aria-label={`Remove social link ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
              {socials.length === 0 && <p className="text-sm text-ivory-500">No links yet.</p>}
            </div>
        </div>
      </Group>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-sm bg-white/[0.03] px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-ivory-200">{label}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] text-ivory-500">{hint}</span>}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        label={label}
      />
    </div>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">{msg}</p>;
}
