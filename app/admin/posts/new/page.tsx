"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { CardSkeleton } from "@/components/ui/feedback";
import type { Category } from "@/types";

export default function NewPostPage() {
  const [categories, setCategories] = React.useState<Category[] | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories((d as { items?: Category[] }).items ?? []))
      .catch(() => setCategories([]));
  }, []);

  return (
    <>
      <PageHeader title="New post" description="Write and publish a story" />
      {categories === null ? (
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <PostForm categories={categories} />
      )}
    </>
  );
}
