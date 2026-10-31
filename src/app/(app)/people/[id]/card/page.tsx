"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, HeartHandshake, MapPin, Printer, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { LoveIcon } from "@/components/loves-editor";
import { NotFound } from "@/components/not-found";
import { Hydrated, Page } from "@/components/page";
import { PersonAvatar } from "@/components/person-avatar";
import { ReactionBadge } from "@/components/reaction";
import { FavoritePlaces, useLearned } from "@/components/record-parts";
import { Button } from "@/components/ui/button";
import { formatDate, pronoun } from "@/lib/format";
import { AVOID_LABELS, historyByPlace } from "@/lib/model";
import { AGENCY } from "@/lib/sample/seed";
import { useOutings, usePerson } from "@/lib/store";

function Block({ title, icon: Icon, children, tone }: { title: string; icon: React.ElementType; children: React.ReactNode; tone?: "lit" | "nope" }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className={tone === "lit" ? "size-4 text-lit-strong" : tone === "nope" ? "size-4 text-nope" : "size-4"} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CardView({ id }: { id: string }) {
  const person = usePerson(id);
  const outings = useOutings(id);
  const learned = useLearned(outings);
  if (!person) return <NotFound />;

  const pr = pronoun(person);
  const logged = outings.filter((o) => o.status === "logged");
  const staff = [...new Set(logged.map((o) => o.staff))];
  const first = logged.at(-1);
  const avoidPlaces = Object.values(historyByPlace(outings)).filter((h) => h.notForThem > 0 && h.notForThem >= h.litUp);

  return (
    <Page className="print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/people/${id}`}>
            <ArrowLeft data-icon="inline-start" />
            Back to record
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print
        </Button>
      </div>

      <article className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center">
          <PersonAvatar person={person} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Handoff card</p>
            <h1 className="text-3xl font-semibold tracking-tight">Meet {person.firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {person.firstName} {person.lastName} · {person.age} · {person.pronouns}
            </p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <LogoMark className="size-5" /> Throughline
          </div>
        </header>

        {person.summary && <p className="border-b py-6 text-lg leading-relaxed text-balance">{person.summary}</p>}

        <div className="grid gap-8 py-6 md:grid-cols-2">
          <div className="space-y-8">
            <Block title={`What lights ${pr.obj} up`} icon={Sparkles} tone="lit">
              <ul className="space-y-2">
                {person.loves.map((l) => {
                  return (
                    <li key={l.id} className="flex items-start gap-2.5 text-[15px]">
                      <LoveIcon love={l} className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{l.name}</span>
                        {l.note && <span className="text-muted-foreground"> — {l.note}</span>}
                      </span>
                    </li>
                  );
                })}
                {learned.likes.slice(0, 4).map((l) => (
                  <li key={l.key} className="flex items-start gap-2.5 text-[15px]">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-lit" />
                    <span>
                      {l.label} <span className="text-sm text-muted-foreground">· seen across {Math.round(l.evidence)} outings</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="Steer clear" icon={Ban} tone="nope">
              <ul className="space-y-2 text-[15px]">
                {person.avoid.map((a) => (
                  <li key={a} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-nope" />
                    {AVOID_LABELS[a]} <span className="text-sm text-muted-foreground">· always</span>
                  </li>
                ))}
                {learned.dislikes.map((l) => (
                  <li key={l.key} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-nope" />
                    <span>
                      {l.label} <span className="text-sm text-muted-foreground">· {Math.round(l.evidence)} outings</span>
                    </span>
                  </li>
                ))}
                {avoidPlaces.map((h) => (
                  <li key={h.last!.place.id} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-nope" />
                    <span>
                      {h.last!.place.name}
                      {h.last!.note && <span className="text-sm text-muted-foreground"> — “{h.last!.note}”</span>}
                    </span>
                  </li>
                ))}
                {!person.avoid.length && !learned.dislikes.length && !avoidPlaces.length && <li className="text-muted-foreground">Nothing consistent yet.</li>}
              </ul>
            </Block>

            <Block title="Places to go back to" icon={MapPin}>
              <FavoritePlaces outings={outings} limit={6} />
            </Block>
          </div>

          <div className="space-y-8">
            <Block title="How to support" icon={HeartHandshake}>
              <dl className="space-y-3 text-[15px]">
                {[
                  ["Talking together", person.support.communication],
                  ["When it's going well", person.support.signsHappy],
                  ["When it's too much", person.support.signsDistress],
                  ["Getting around", person.support.mobility === "none" ? "Walks independently" : `Uses a ${person.support.mobility}`],
                  ["Diet", person.support.dietary],
                  ["Also", person.support.other],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm text-muted-foreground">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            </Block>

            <Block title="Last few outings" icon={Sparkles}>
              <ul className="space-y-2.5">
                {logged.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-start gap-2.5 text-sm">
                    <ReactionBadge reaction={o.reaction!} iconOnly />
                    <span className="min-w-0">
                      <span className="font-medium">{o.place.name}</span>
                      <span className="text-muted-foreground"> · {formatDate(o.date, { month: "short", day: "numeric" })}</span>
                      {o.note && <span className="block text-muted-foreground">“{o.note}”</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          </div>
        </div>

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Built from {logged.length} logged outings by {staff.length} staff
          {first ? ` since ${formatDate(first.date, { month: "short", day: "numeric" })}` : ""}. Every line above comes from {pr.pos} profile or a logged outing. {AGENCY}.
          {logged.some((o) => o.sample) && " Includes sample history for demonstration."}
        </footer>
      </article>
    </Page>
  );
}

export default function HandoffCardPage({ params }: PageProps<"/people/[id]/card">) {
  const { id } = use(params);
  return (
    <Hydrated>
      <CardView id={id} />
    </Hydrated>
  );
}
