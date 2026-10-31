"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Hydrated, Page, PageHeader } from "@/components/page";
import { PersonForm, blankPerson } from "@/components/person-form";
import { useStore } from "@/lib/store";

function NewPersonView() {
  const router = useRouter();
  const addPerson = useStore((s) => s.addPerson);
  const [initial] = useState(blankPerson);
  return (
    <Page>
      <PageHeader title="Add a person" description="Fill in what you know now. The record grows with every outing you log." />
      <PersonForm
        initial={initial}
        submitLabel="Create record"
        onCancel={() => router.back()}
        onSubmit={(p) => {
          addPerson(p);
          toast.success(`${p.firstName}'s record is ready`);
          router.push(`/people/${p.id}/plan`);
        }}
      />
    </Page>
  );
}

export default function NewPersonPage() {
  return (
    <Hydrated>
      <NewPersonView />
    </Hydrated>
  );
}
