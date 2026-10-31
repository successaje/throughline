"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accessibility, Ban, FileText, IdCard, MapPin, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";
import { LogReactionDialog } from "@/components/log-reaction";
import { LoveChip } from "@/components/loves-editor";
import { NotFound } from "@/components/not-found";
import { Hydrated, Page, SectionTitle } from "@/components/page";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressNoteDialog } from "@/components/progress-note";
import { FavoritePlaces, LearnedRow, OutingRow, OutingTimeline, useLearned } from "@/components/record-parts";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pronoun } from "@/lib/format";
import { AVOID_LABELS } from "@/lib/model";
import { useOutings, usePerson, useStore } from "@/lib/store";
import type { Outing, Person } from "@/lib/types";

const MOBILITY: Record<Person["support"]["mobility"], string> = {
  none: "Walks independently",
  cane: "Uses a cane",
  walker: "Uses a walker",
  wheelchair: "Uses a wheelchair — check for a step-free entrance",
};

function Panel({ title, icon: Icon, children, action }: { title: string; icon?: React.ElementType; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <SectionTitle action={action}>
        <span className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </span>
      </SectionTitle>
      {children}
    </section>
  );
}

function SupportList({ person }: { person: Person }) {
  const rows = [
    ["Communication", person.support.communication],
    ["When it's going well", person.support.signsHappy],
    ["When it's too much", person.support.signsDistress],
    ["Mobility", MOBILITY[person.support.mobility]],
    ["Staff ratio", person.support.staffRatio],
    ["Diet", person.support.dietary],
    ["Also", person.support.other],
  ].filter(([, v]) => v);
  return (
    <dl className="divide-y text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[140px_1fr] sm:gap-4">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function PersonView({ id }: { id: string }) {
  const router = useRouter();
  const person = usePerson(id);
  const outings = useOutings(id);
  const removePerson = useStore((s) => s.removePerson);
  const learned = useLearned(outings);
  const [logging, setLogging] = useState<Outing | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  if (!person) return <NotFound />;

  const pr = pronoun(person);
  const logged = outings.filter((o) => o.status === "logged");
  const planned = outings.filter((o) => o.status === "planned");
  const staffCount = new Set(logged.map((o) => o.staff)).size;

  return (
    <Page wide>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
        <PersonAvatar person={person} size="xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {person.firstName} {person.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {person.age} · {person.pronouns} · {person.home.label}
            </p>
          </div>
          {person.summary && <p className="max-w-2xl text-[15px] leading-relaxed">{person.summary}</p>}
          <p className="text-xs text-muted-foreground">
            {logged.length} outings logged by {staffCount} staff{staffCount === 1 ? "" : " members"}. This record stays with {pr.obj} when staff change.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild>
            <Link href={`/people/${id}/plan`}>
              <MapPin data-icon="inline-start" />
              Plan an outing
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/people/${id}/card`}>
              <IdCard data-icon="inline-start" />
              Handoff card
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
                <FileText />
                Draft progress note
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/people/${id}/edit`}>
                  <Pencil />
                  Edit profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  removePerson(id);
                  router.push("/people");
                }}
              >
                <Trash2 />
                Remove record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">
            History <span className="ml-1 text-muted-foreground tabular-nums">{outings.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-4">
            <Panel title="Lights them up" icon={Sparkles}>
              <div className="mb-4 flex flex-wrap gap-2">
                {person.loves.map((l) => (
                  <LoveChip key={l.id} love={l} />
                ))}
              </div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Learned from {logged.length} outings</p>
              {learned.likes.length ? (
                learned.likes.slice(0, 6).map((l) => <LearnedRow key={l.key} item={l} tone="up" />)
              ) : (
                <p className="text-sm text-muted-foreground">Patterns show up after a few logged outings.</p>
              )}
            </Panel>
            <Panel title="Steer clear" icon={Ban}>
              {person.avoid.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {person.avoid.map((a) => (
                    <span key={a} className="rounded-full bg-nope-soft px-2.5 py-1 text-xs font-medium text-nope">
                      Always avoid: {AVOID_LABELS[a]}
                    </span>
                  ))}
                </div>
              )}
              {learned.dislikes.length ? (
                learned.dislikes.map((l) => <LearnedRow key={l.key} item={l} tone="down" />)
              ) : (
                <p className="text-sm text-muted-foreground">Nothing consistent yet.</p>
              )}
            </Panel>
            <Panel title="Places they love" icon={MapPin}>
              <FavoritePlaces outings={outings} />
            </Panel>
          </div>
          <div className="space-y-4">
            <Panel title="How to support" icon={Accessibility} action={<Button asChild variant="link" size="sm" className="h-auto px-0"><Link href={`/people/${id}/edit`}>Edit</Link></Button>}>
              <SupportList person={person} />
            </Panel>
            <Panel title="Recent outings">
              {planned.length > 0 && (
                <ul className="mb-2 divide-y border-b">
                  {planned.map((o) => (
                    <OutingRow key={o.id} outing={o} onLog={setLogging} compact />
                  ))}
                </ul>
              )}
              <ul className="divide-y">
                {logged.slice(0, 4).map((o) => (
                  <OutingRow key={o.id} outing={o} compact />
                ))}
              </ul>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <OutingTimeline outings={outings} onLog={setLogging} />
          </div>
        </TabsContent>
      </Tabs>

      <LogReactionDialog outing={logging} open={Boolean(logging)} onOpenChange={(o) => !o && setLogging(null)} />
      <ProgressNoteDialog person={person} outings={outings} open={noteOpen} onOpenChange={setNoteOpen} />
    </Page>
  );
}

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = use(params);
  return (
    <Hydrated>
      <PersonView id={id} />
    </Hydrated>
  );
}
