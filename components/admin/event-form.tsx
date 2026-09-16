"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label, FieldError, Select, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RichEditor } from "./rich-editor";
import { CoverInput } from "./cover-input";
import { slugify } from "@/lib/utils";
import type { EventItem, Speaker } from "@/types";

type FormValues = z.infer<typeof eventSchema>;

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ initial, speakers }: { initial?: EventItem; speakers: Speaker[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register, handleSubmit, control, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      contentHtml: initial?.contentHtml ?? "",
      startAt: initial?.startAt ?? new Date().toISOString(),
      endAt: initial?.endAt ?? "",
      timezone: initial?.timezone ?? "",
      venue: initial?.venue ?? "",
      address: initial?.address ?? "",
      coverImage: initial?.coverImage ?? "",
      speakerIds: initial?.speakerIds ?? [],
      registrationUrl: initial?.registrationUrl ?? "",
      price: initial?.price ?? "",
      status: initial?.status ?? "draft",
      featured: initial?.featured ?? false,
      seo: { title: initial?.seo?.title ?? "", description: initial?.seo?.description ?? "", keywords: "", ogImage: "" },
    },
  });

  const title = watch("title");
  const slugTouched = React.useRef(Boolean(initial?.slug));
  React.useEffect(() => {
    if (!slugTouched.current && title) setValue("slug", slugify(title));
  }, [title, setValue]);

  async function onSubmit(values: FormValues) {
    try {
      const url = initial ? `/api/admin/events/${initial.id}` : "/api/admin/events";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Save failed");
      toast({ kind: "success", title: initial ? "Event updated" : "Event created" });
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      toast({ kind: "error", title: "Save failed", message: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <div>
              <Label>Title *</Label>
              <Input {...register("title")} error={errors.title?.message} />
              <FieldError message={errors.title?.message} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input {...register("slug")} onChange={(e) => { slugTouched.current = true; setValue("slug", slugify(e.target.value)); }} />
            </div>
            <div>
              <Label>Short description *</Label>
              <Textarea rows={3} {...register("description")} error={errors.description?.message} />
              <FieldError message={errors.description?.message} />
            </div>
            <Controller
              name="contentHtml"
              control={control}
              render={({ field }) => <RichEditor label="Full details (agenda, notes…)" value={field.value ?? ""} onChange={field.onChange} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <h2 className="font-display text-base font-bold text-ink-900 sm:col-span-2">Date & venue</h2>
            <div>
              <Label>Starts at *</Label>
              <Controller
                name="startAt"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    value={toLocalInput(field.value)}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                )}
              />
              <FieldError message={errors.startAt?.message} />
            </div>
            <div>
              <Label>Ends at</Label>
              <Controller
                name="endAt"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    value={toLocalInput(field.value ?? "")}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                )}
              />
            </div>
            <div>
              <Label>Venue</Label>
              <Input {...register("venue")} placeholder="Main Hall" />
            </div>
            <div>
              <Label>Address</Label>
              <Input {...register("address")} placeholder="Street, City" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input {...register("timezone")} placeholder="America/New_York" />
            </div>
            <div>
              <Label>Price label</Label>
              <Input {...register("price")} placeholder="Free / $49 / From $99" />
            </div>
            <div className="sm:col-span-2">
              <Label>Registration URL</Label>
              <Input {...register("registrationUrl")} placeholder="https://tickets.example.com/…" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <h2 className="font-display text-base font-bold text-ink-900">Publish</h2>
            <div>
              <Label>Status</Label>
              <Select {...register("status")}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
              <span className="text-sm font-semibold text-ink-700">Featured</span>
              <Controller name="featured" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} label="Featured" />} />
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full">
              {initial ? "Save changes" : "Create event"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6">
            <h2 className="font-display text-base font-bold text-ink-900">Media & speakers</h2>
            <Controller name="coverImage" control={control} render={({ field }) => <CoverInput value={field.value ?? ""} onChange={field.onChange} />} />
            <div>
              <Label>Speakers</Label>
              <Controller
                name="speakerIds"
                control={control}
                render={({ field }) => (
                  <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-xl border border-ink-200 p-2">
                    {speakers.length === 0 && <p className="p-2 text-sm text-ink-400">No speakers yet.</p>}
                    {speakers.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50">
                        <input
                          type="checkbox"
                          checked={field.value.includes(s.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...field.value, s.id]
                              : field.value.filter((id: string) => id !== s.id);
                            field.onChange(next);
                          }}
                          className="h-4 w-4 accent-pink-600"
                        />
                        <span className="font-medium text-ink-800">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
