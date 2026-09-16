"use client";

import * as React from "react";
import { EventCard } from "@/components/public/cards";
import { LoadMore } from "@/components/ui/feedback";
import type { EventItem } from "@/types";

export function EventsClient({ initialCursor }: { initialCursor: string | null }) {
  const [items, setItems] = React.useState<EventItem[]>([]);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/public/events?limit=9&cursor=${encodeURIComponent(cursor)}`);
      const data = (await res.json()) as { items: EventItem[]; nextCursor: string | null };
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
          {items.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
      <LoadMore hasMore={cursor !== null} loading={loading} onLoad={loadMore} />
    </>
  );
}
