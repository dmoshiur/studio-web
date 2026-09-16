import { PageHeader } from "@/components/admin/page-header";
import { SpeakerForm } from "@/components/admin/speaker-form";

export default function NewSpeakerPage() {
  return (
    <>
      <PageHeader title="New speaker" description="Add someone to the lineup" />
      <SpeakerForm />
    </>
  );
}
