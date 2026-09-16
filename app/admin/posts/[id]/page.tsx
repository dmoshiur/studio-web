"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import type { Category, Post } from "@/types";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const [post, setPost] = React.useState<Post | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/admin/posts/${params.id}`).then((r) => {
        if (!r.ok) throw new Error("Post not found");
        return r.json() as Promise<Post>;
      }),
      fetch("/api/admin/categories").then((r) => r.json()).then((d) => (d as { items?: Category[] }).items ?? []),
    ])
      .then(([p, c]) => {
        setPost(p);
        setCategories(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id]);

  if (error) return <ErrorState message={error} />;
  if (!post) {
    return (
      <>
        <PageHeader title="Edit post" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Edit post" description={post.title} />
      <PostForm initial={post} categories={categories} />
    </>
  );
}
