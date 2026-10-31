"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hydrated, Page, PageHeader } from "@/components/page";
import { PersonForm } from "@/components/person-form";
import { NotFound } from "@/components/not-found";
import { usePerson, useStore } from "@/lib/store";

function EditView({ id }: { id: string }) {
  const router = useRouter();
  const person = usePerson(id);
  const updatePerson = useStore((s) => s.updatePerson);
  if (!person) return <NotFound />;
  return (
    <Page>
      <PageHeader eyebrow={`${person.firstName} ${person.lastName}`} title="Edit profile" />
      <PersonForm
        initial={person}
        submitLabel="Save changes"
        onCancel={() => router.back()}
        onSubmit={(p) => {
          updatePerson(id, p);
          toast.success("Profile saved");
          router.push(`/people/${id}`);
        }}
      />
    </Page>
  );
}

export default function EditPersonPage({ params }: PageProps<"/people/[id]/edit">) {
  const { id } = use(params);
  return (
    <Hydrated>
      <EditView id={id} />
    </Hydrated>
  );
}
