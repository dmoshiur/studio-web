"use client";

import * as React from "react";
import Link from "next/link";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { OwnerSectionEditor } from "@/components/admin/owner-section-editor";
import { ownerProfileBodySchema } from "@/lib/validation/schemas";
import { normaliseOwnerProfile } from "@/lib/owner-defaults";
import { api } from "@/hooks/use-api";
import type { OwnerProfile } from "@/types";

type FormValues = { owner: OwnerProfile };

interface MediaConfig {
  provider: "cloudinary" | "firebase" | "local";
  directUpload: boolean;
  limitsMb: { image: number; video: number; audio: number; document: number };
}

function flattenOwnerErrors(errors: FieldErrors<OwnerProfile> | undefined) {
  if (!errors) return {};
  const out: Partial<Record<keyof OwnerProfile, string>> = {};
  for (const [key, value] of Object.entries(errors)) {
    const message = (value as { message?: string } | undefined)?.message;
    if (message) out[key as keyof OwnerProfile] = message;
  }
  return out;
}

/** Studio → Owner Section: the portrait, name and texts shown on the site. */
export default function AdminOwnerSectionPage() {
  const [initial, setInitial] = React.useState<OwnerProfile | null>(null);
  const [config, setConfig] = React.useState<MediaConfig | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(ownerProfileBodySchema),
    defaultValues: { owner: normaliseOwnerProfile(undefined) },
  });

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [data, mediaConfig] = await Promise.all([
        api<{ owner?: OwnerProfile }>("/api/admin/owner-section"),
        api<MediaConfig>("/api/admin/media/config").catch(() => null),
      ]);
      const owner = normaliseOwnerProfile(data.owner);
      setInitial(owner);
      setConfig(mediaConfig);
      reset({ owner });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the owner section");
    }
  }, [reset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <>
        <PageHeader title="Owner section" description="The portrait and personal message shown on the public site" />
        <ErrorState message={error} onRetry={load} />
      </>
    );
  }

  if (!initial) {
    return (
      <>
        <PageHeader title="Owner section" description="The portrait and personal message shown on the public site" />
        <div className="grid gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </>
    );
  }

  async function onSubmit(values: FormValues) {
    try {
      const saved = await api<{ owner: OwnerProfile }>("/api/admin/owner-section", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const owner = normaliseOwnerProfile(saved.owner);
      setInitial(owner);
      reset({ owner });
      toast({ kind: "success", title: "Owner section saved", message: "The public pages update within seconds." });
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    }
  }

  const storageLabel = config
    ? config.provider === "cloudinary"
      ? "Cloudinary (images, video, audio and files)"
      : config.provider === "firebase"
        ? "Firebase Storage"
        : "Embedded disk storage"
    : "…";

  return (
    <>
      <PageHeader
        title="Owner section"
        description="A portrait, a name and a personal message — everything here is editable and appears on the homepage and the about page."
        eyebrow="Site"
        action={
          <Link
            href="/#owner"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 border border-white/[0.12] px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ivory-200 transition-colors hover:border-gold-500/60 hover:text-gold-200"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View on site
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
        <Controller
          name="owner"
          control={control}
          render={({ field }) => (
            <OwnerSectionEditor
              value={field.value}
              onChange={field.onChange}
              errors={flattenOwnerErrors(errors.owner)}
              videoLimitMb={config?.limitsMb.video ?? 100}
            />
          )}
        />

        <p className="text-[12.5px] text-ivory-500">
          Media storage: <span className="text-ivory-300">{storageLabel}</span>
          {config ? ` · images up to ${config.limitsMb.image} MB · video up to ${config.limitsMb.video} MB` : null}
        </p>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 border border-white/[0.07] bg-obsidian-900/95 p-4 backdrop-blur">
          <span className="text-[12.5px] text-ivory-500">
            {isDirty ? "You have unsaved changes." : "Everything is saved."}
          </span>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => reset({ owner: initial })}
              disabled={!isDirty || isSubmitting}
            >
              <RotateCcw /> Discard
            </Button>
            <Button type="submit" loading={isSubmitting} className="shadow-gold-sm">
              Save owner section
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
