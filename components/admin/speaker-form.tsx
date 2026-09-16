"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { speakerSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label, FieldError, Select, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CoverInput } from "./cover-input";
import { slugify } from "@/lib/utils";
import type { Speaker } from "@/types";

type FormValues = z.infer<typeof speakerSchema>;

export function SpeakerForm({ initial }: { initial?: Speaker }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register, handleSubmit, control, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      title: initial?.title ?? "",
      company: initial?.company ?? "",
      bio: initial?.bio ?? "",
      photoURL: initial?.photoURL ?? "",
      socials: initial?.socials ?? [],
      featured: initial?.featured ?? false,
      status: initial?.status ?? "published",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "socials" });
  const name = watch("name");
  const slugTouched = React.useRef(Boolean(initial?.slug));
  React.useEffect(() => {
    if (!slugTouched.current && name) setValue("slug", slugify(name));
  }, [name, setValue]);

  async function onSubmit(values: FormValues) {
    try {
      const url = initial ? `/api/admin/speakers/${initial.id}` : "/api/admin/speakers";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Save failed");
      toast({ kind: "success", title: initial ? "Speaker updated" : "Speaker created" });
      router.push("/admin/speakers");
      router.refresh();
    } catch (err) {
      toast({ kind: "error", title: "Save failed", message: err instanceof Error ? err.message : undefined });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input {...register("name")} error={errors.name?.message} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input {...register("slug")} onChange={(e) => { slugTouched.current = true; setValue("slug", slugify(e.target.value)); }} />
          </div>
          <div>
            <Label>Job title</Label>
            <Input {...register("title")} placeholder="CTO" />
          </div>
          <div>
            <Label>Company</Label>
            <Input {...register("company")} placeholder="Acme Inc." />
          </div>
          <div className="sm:col-span-2">
            <Label>Bio *</Label>
            <Textarea rows={6} {...register("bio")} error={errors.bio?.message} />
            <FieldError message={errors.bio?.message} />
          </div>
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Social links</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => append({ label: "", url: "" })}>
                <Plus /> Add
              </Button>
            </div>
            <div className="grid gap-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <Input {...register(`socials.${i}.label`)} placeholder="LinkedIn" className="w-36" />
                  <Input {...register(`socials.${i}.url`)} placeholder="https://…" className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove link">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
              {fields.length === 0 && <p className="text-sm text-ivory-500">No social links yet.</p>}
            </div>
            {errors.socials && <FieldError message="One or more social links are invalid (label + full https URL required)" />}
          </div>
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <h2 className="font-serif text-base font-bold text-ivory-50">Publish</h2>
            <div>
              <Label>Status</Label>
              <Select {...register("status")}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-sm bg-white/[0.03] px-4 py-3">
              <span className="text-sm font-semibold text-ivory-200">Featured</span>
              <Controller name="featured" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} label="Featured" />} />
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full">
              {initial ? "Save changes" : "Create speaker"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Controller name="photoURL" control={control} render={({ field }) => <CoverInput label="Photo" value={field.value ?? ""} onChange={field.onChange} />} />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
