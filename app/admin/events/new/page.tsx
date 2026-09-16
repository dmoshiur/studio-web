"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";
import { CardSkeleton } from "@/components/ui/feedback";
import type { Speaker } from "@/types";

export default function NewEventPage() {
  const [speakers, setSpeakers] = React.useState<Speaker[] | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/speakers")
      .then((r) => r.json())
      .then((d) => setSpeakers((d as { items?: Speaker[] }).items ?? []))
      .catch(() => setSpeakers([]));
  }, []);

  return (
    <>
      <PageHeader title="New event" description="Add a session to the schedule" />
      {speakers === null ? (
        <div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <EventForm speakers={speakers} />
      )}
    </>
  );
}
