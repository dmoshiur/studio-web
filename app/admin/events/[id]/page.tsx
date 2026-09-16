"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import type { EventItem, Speaker } from "@/types";

export default function EditEventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = React.useState<EventItem | null>(null);
  const [speakers, setSpeakers] = React.useState<Speaker[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/admin/events/${params.id}`).then((r) => {
        if (!r.ok) throw new Error("Event not found");
        return r.json() as Promise<EventItem>;
      }),
      fetch("/api/admin/speakers").then((r) => r.json()).then((d) => (d as { items?: Speaker[] }).items ?? []),
    ])
      .then(([e, s]) => {
        setEvent(e);
        setSpeakers(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id]);

  if (error) return <ErrorState message={error} />;
  if (!event) {
    return (
      <>
        <PageHeader title="Edit event" />
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Edit event" description={event.title} />
      <EventForm initial={event} speakers={speakers} />
    </>
  );
}
