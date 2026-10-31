"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Sparkles } from "lucide-react";
import { SampleBanner } from "@/components/app-shell";
import { LogReactionDialog } from "@/components/log-reaction";
import { EmptyState, Hydrated, Page, PageHeader, SectionTitle } from "@/components/page";
import { PersonAvatar } from "@/components/person-avatar";
import { PersonCard } from "@/components/person-card";
import { Button } from "@/components/ui/button";
import { formatDate, relativeDay, todayIso } from "@/lib/format";
import { currentStaff, useStore } from "@/lib/store";
import type { Outing } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function TodayView() {
  const people = useStore((s) => s.people);
  const outings = useStore((s) => s.outings);
  const [logging, setLogging] = useState<Outing | null>(null);

  const planned = outings.filter((o) => o.status === "planned").sort((a, b) => (a.date < b.date ? -1 : 1));
  const wins = outings
    .filter((o) => o.status === "logged" && o.reaction === "lit_up")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  return (
    <Page>
      <PageHeader
        eyebrow={formatDate(todayIso(), { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${currentStaff.name.split(" ")[0]}`}
        description="Plan outings around what each person loves, then log how it went. Every log teaches the next shift."
      />

      <section className="mb-10">
        <SectionTitle>Waiting for a reaction</SectionTitle>
        {planned.length ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {planned.map((o) => {
              const p = byId[o.personId];
              if (!p) return null;
              return (
                <li key={o.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <PersonAvatar person={p} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{o.place.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.firstName} · {relativeDay(o.date)}
                      {o.window ? ` · ${o.window}` : ""}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setLogging(o)}>
                    Log reaction
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={CalendarClock} title="Nothing waiting">
            When you choose a plan, it shows up here so you can log how it went in one tap.
          </EmptyState>
        )}
      </section>

      <section className="mb-10">
        <SectionTitle
          action={
            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <Link href="/people">All people</Link>
            </Button>
          }
        >
          Your people
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      </section>

      {wins.length > 0 && (
        <section className="mb-10">
          <SectionTitle>Recent bright spots</SectionTitle>
          <ol className="relative space-y-4 border-l pl-5">
            {wins.map((o) => {
              const p = byId[o.personId];
              if (!p) return null;
              return (
                <li key={o.id} className="relative">
                  <span className="absolute top-1 -left-[27px] flex size-3.5 items-center justify-center rounded-full bg-lit-soft ring-4 ring-background">
                    <Sparkles className="size-2.5 text-lit-strong" />
                  </span>
                  <p className="text-sm">
                    <Link href={`/people/${p.id}`} className="font-medium hover:underline">
                      {p.firstName}
                    </Link>{" "}
                    lit up at <span className="font-medium">{o.place.name}</span>
                    <span className="text-muted-foreground"> · {relativeDay(o.date)} · {o.staff}</span>
                  </p>
                  {o.note && <p className="mt-0.5 text-sm text-muted-foreground">“{o.note}”</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <SampleBanner />
      <LogReactionDialog outing={logging} open={Boolean(logging)} onOpenChange={(o) => !o && setLogging(null)} />
    </Page>
  );
}

export default function TodayPage() {
  return (
    <Hydrated>
      <TodayView />
    </Hydrated>
  );
}
