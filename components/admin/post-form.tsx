"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { postSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label, FieldError, Select, Switch } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RichEditor } from "./rich-editor";
import { CoverInput } from "./cover-input";
import { slugify } from "@/lib/utils";
import type { Category, Post } from "@/types";

type FormValues = z.infer<typeof postSchema>;

export function PostForm({ initial, categories }: { initial?: Post; categories: Category[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register, handleSubmit, control, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      excerpt: initial?.excerpt ?? "",
      contentHtml: initial?.contentHtml ?? "",
      coverImage: initial?.coverImage ?? "",
      categoryId: initial?.categoryId ?? "",
      tags: initial?.tags ?? [],
      authorName: initial?.authorName ?? "",
      status: initial?.status ?? "draft",
      featured: initial?.featured ?? false,
      scheduledAt: "",
      seo: { title: initial?.seo?.title ?? "", description: initial?.seo?.description ?? "", keywords: initial?.seo?.keywords ?? "", ogImage: initial?.seo?.ogImage ?? "" },
    },
  });

  const title = watch("title");
  const slugTouched = React.useRef(Boolean(initial?.slug));

  React.useEffect(() => {
    if (!slugTouched.current && title) setValue("slug", slugify(title));
  }, [title, setValue]);

  async function onSubmit(values: FormValues) {
    try {
      const url = initial ? `/api/admin/posts/${initial.id}` : "/api/admin/posts";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, scheduledAt: values.scheduledAt || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Save failed");
      toast({ kind: "success", title: initial ? "Post updated" : "Post created" });
      router.push("/admin/posts");
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
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} error={errors.title?.message} />
              <FieldError message={errors.title?.message} />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...register("slug")} onChange={(e) => { slugTouched.current = true; setValue("slug", slugify(e.target.value)); }} error={errors.slug?.message} />
              <FieldError message={errors.slug?.message} />
            </div>
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" rows={3} {...register("excerpt")} placeholder="Auto-generated from content if left empty" />
            </div>
            <Controller
              name="contentHtml"
              control={control}
              render={({ field }) => <RichEditor label="Content *" value={field.value} onChange={field.onChange} />}
            />
            <FieldError message={errors.contentHtml?.message} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6">
            <h2 className="font-serif text-base font-bold text-ivory-50">SEO</h2>
            <div>
              <Label>Meta title</Label>
              <Input {...register("seo.title")} placeholder="Defaults to post title" />
            </div>
            <div>
              <Label>Meta description</Label>
              <Textarea rows={2} {...register("seo.description")} placeholder="Defaults to excerpt" />
            </div>
            <div>
              <Label>Keywords</Label>
              <Input {...register("seo.keywords")} placeholder="comma, separated, keywords" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <h2 className="font-serif text-base font-bold text-ivory-50">Publish</h2>
            <div>
              <Label>Status</Label>
              <Select {...register("status")}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div>
              <Label>Author *</Label>
              <Input {...register("authorName")} placeholder="Author name" error={errors.authorName?.message} />
              <FieldError message={errors.authorName?.message} />
            </div>
            <div className="flex items-center justify-between rounded-sm bg-white/[0.03] px-4 py-3">
              <span className="text-sm font-semibold text-ivory-200">Featured post</span>
              <Controller
                name="featured"
                control={control}
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} label="Featured post" />}
              />
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full">
              {initial ? "Save changes" : "Create post"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6">
            <h2 className="font-serif text-base font-bold text-ivory-50">Organization</h2>
            <div>
              <Label>Category</Label>
              <Select {...register("categoryId")}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <Input
                    value={field.value.join(", ")}
                    onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                    placeholder="keynote, recap"
                  />
                )}
              />
            </div>
            <Controller
              name="coverImage"
              control={control}
              render={({ field }) => <CoverInput value={field.value ?? ""} onChange={field.onChange} />}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
