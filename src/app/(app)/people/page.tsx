"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { SampleBanner } from "@/components/app-shell";
import { EmptyState, Hydrated, Page, PageHeader } from "@/components/page";
import { PersonCard } from "@/components/person-card";
import { Button } from "@/components/ui/button";
import { AGENCY } from "@/lib/sample/seed";
import { useStore } from "@/lib/store";

function PeopleView() {
  const people = useStore((s) => s.people);
  return (
    <Page>
      <PageHeader
        eyebrow={AGENCY}
        title="People"
        description="Each record holds what someone loves, how to support them, and what every outing taught the team."
        actions={
          <Button asChild>
            <Link href="/people/new">
              <Plus data-icon="inline-start" />
              Add person
            </Link>
          </Button>
        }
      />
      {people.length ? (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No one here yet" action={<Button asChild><Link href="/people/new">Add the first person</Link></Button>}>
          Start with a few things they love. Throughline does the rest.
        </EmptyState>
      )}
      <SampleBanner />
    </Page>
  );
}

export default function PeoplePage() {
  return (
    <Hydrated>
      <PeopleView />
    </Hydrated>
  );
}
