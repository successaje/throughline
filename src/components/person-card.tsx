"use client";

import Link from "next/link";
import { ArrowRight, IdCard, MapPin } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { ReactionBadge } from "@/components/reaction";
import { Button } from "@/components/ui/button";
import { relativeDay } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Person } from "@/lib/types";

export function PersonCard({ person }: { person: Person }) {
  const outings = useStore((s) => s.outings);
  const mine = outings.filter((o) => o.personId === person.id && o.status === "logged").sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = mine[0];
  const brightSpots = new Set(mine.filter((o) => o.reaction === "lit_up").map((o) => o.place.id)).size;

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex items-start gap-3">
        <PersonAvatar person={person} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/people/${person.id}`} className="font-semibold tracking-tight after:absolute after:inset-0 after:rounded-xl">
            {person.firstName} {person.lastName}
          </Link>
          <p className="text-sm text-muted-foreground">
            {person.age} · {person.pronouns}
          </p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {person.loves.slice(0, 4).map((l) => (
          <span key={l.id} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {l.name}
          </span>
        ))}
      </div>
      <div className="mt-4 flex min-h-6 items-center gap-2 text-sm text-muted-foreground">
        {last ? (
          <>
            <ReactionBadge reaction={last.reaction!} iconOnly />
            <span className="truncate">
              <span className="text-foreground">{last.place.name}</span> · {relativeDay(last.date)}
            </span>
          </>
        ) : (
          <span>No outings logged yet</span>
        )}
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-2 border-t pt-3">
        <Button asChild size="sm">
          <Link href={`/people/${person.id}/plan`}>
            <MapPin data-icon="inline-start" />
            Plan an outing
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/people/${person.id}/card`}>
            <IdCard data-icon="inline-start" />
            Handoff card
          </Link>
        </Button>
        {brightSpots > 0 && (
          <span className="ml-auto hidden text-xs whitespace-nowrap text-muted-foreground sm:inline">
            {brightSpots} bright spot{brightSpots === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}
