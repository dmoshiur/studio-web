"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { SpeakerForm } from "@/components/admin/speaker-form";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import type { Speaker } from "@/types";

export default function EditSpeakerPage({ params }: { params: { id: string } }) {
  const [speaker, setSpeaker] = React.useState<Speaker | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/admin/speakers/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Speaker not found");
        return r.json() as Promise<Speaker>;
      })
      .then(setSpeaker)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id]);

  if (error) return <ErrorState message={error} />;
  if (!speaker) {
    return (
      <>
        <PageHeader title="Edit speaker" />
        <div className="grid gap-4"><CardSkeleton /></div>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Edit speaker" description={speaker.name} />
      <SpeakerForm initial={speaker} />
    </>
  );
}
