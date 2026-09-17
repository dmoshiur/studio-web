"use client";

import * as React from "react";
import { PostCard } from "@/components/public/cards";
import { LoadMore } from "@/components/ui/feedback";
import type { Post } from "@/types";

export function BlogClient({ initialCursor, category }: { initialCursor: string | null; category?: string }) {
  const [items, setItems] = React.useState<Post[]>([]);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const url = new URL("/api/public/posts", window.location.origin);
      url.searchParams.set("limit", "9");
      url.searchParams.set("cursor", cursor);
      if (category) url.searchParams.set("category", category);
      const res = await fetch(url.toString());
      const data = (await res.json()) as { items: Post[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  if (!items.length && !cursor) return null;
  return (
    <>
      {items.length > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
      <LoadMore tone="light" hasMore={cursor !== null} loading={loading} onLoad={loadMore} />
    </>
  );
}
