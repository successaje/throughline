"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Database, Info, Lightbulb, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { LogReactionDialog } from "@/components/log-reaction";
import { NotFound } from "@/components/not-found";
import { Hydrated, Page } from "@/components/page";
import { PersonAvatar } from "@/components/person-avatar";
import { AgentTrace } from "@/components/planner/agent-trace";
import { ConstraintsForm } from "@/components/planner/constraints-form";
import { PlanCard } from "@/components/planner/plan-card";
import { RankedList } from "@/components/planner/ranked-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWindow, todayIso } from "@/lib/format";
import { lessonOf, movement, rank } from "@/lib/model";
import { currentStaff, newId, useOutings, usePerson, useStore, type PlanRun } from "@/lib/store";
import type { Outing, Person, PlanConstraints, PlanEvent } from "@/lib/types";

function defaults(person: Person): PlanConstraints {
  return {
    date: todayIso(),
    start: "13:00",
    end: "16:00",
    budget: person.defaults.budget,
    radiusKm: person.defaults.radiusKm,
    transport: person.defaults.transport,
    includeAtHome: true,
  };
}

function HowItWorks({ name }: { name: string }) {
  const steps = [
    { icon: Sparkles, title: "Qloo proposes", body: `Real places nearby that match what ${name} loves, open that day and within budget.` },
    { icon: TrendingUp, title: "Their reactions decide", body: "Every logged outing re-weights the ranking: more of what lit them up, less of what didn't." },
    { icon: Lightbulb, title: "One new thing to learn from", body: "Each plan mixes a proven favorite with one new place worth trying." },
  ];
  return (
    <div className="rounded-xl border border-dashed p-6 sm:p-8">
      <p className="mb-5 font-medium">Pick the shift, then find outings.</p>
      <ol className="grid gap-5 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="space-y-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <s.icon className="size-4" />
            </span>
            <p className="text-sm font-semibold">
              {i + 1}. {s.title}
            </p>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanView({ id }: { id: string }) {
  const person = usePerson(id);
  const outings = useOutings(id);
  const savedRun = useStore((s) => s.runs[id]);
  const tagNames = useStore((s) => s.tagNames);
  const { saveRun, scheduleOuting, resolveLoves, rememberTags } = useStore.getState();

  const [constraints, setConstraints] = useState<PlanConstraints | null>(savedRun?.constraints ?? (person ? defaults(person) : null));
  const [run, setRun] = useState<PlanRun | null>(savedRun ?? null);
  const [running, setRunning] = useState(false);
  const [logging, setLogging] = useState<Outing | null>(null);
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [lesson, setLesson] = useState<{ place: string; lines: string[]; movers: string[] } | null>(null);
  const pendingBefore = useRef<{ order: string[]; outing: Outing } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => (run && person ? rank(run.candidates, person, outings, tagNames) : []), [run, person, outings, tagNames]);

  // After a reaction is logged, compare the ranking before and after.
  useEffect(() => {
    const pending = pendingBefore.current;
    if (!pending) return;
    pendingBefore.current = null;
    const after = ranked.map((r) => r.candidate.id);
    const m = movement(pending.order, after);
    setMoves(m);
    const names = Object.fromEntries(ranked.map((r) => [r.candidate.id, r.candidate.name]));
    const movers = Object.entries(m)
      .filter(([, d]) => Math.abs(d) >= 2)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([cid, d]) => `${names[cid]} ${d > 0 ? "up" : "down"} ${Math.abs(d)}`);
    setLesson({ place: pending.outing.place.name, lines: lessonOf(pending.outing), movers });
    const t = setTimeout(() => setMoves({}), 7000);
    return () => clearTimeout(t);
  }, [ranked]);

  if (!person || !constraints) return <NotFound />;

  const start = async () => {
    const draft: PlanRun = { constraints, steps: [], candidates: [], media: [], plans: [], summary: "", notices: [], seed: Math.floor(Math.random() * 1e9) };
    setRun({ ...draft });
    setRunning(true);
    setLesson(null);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person, outings, constraints, tagNames, seed: draft.seed }),
      });
      if (!res.ok || !res.body) throw new Error(`Planner returned ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as PlanEvent;
          switch (e.type) {
            case "mode":
              draft.mode = e.mode;
              break;
            case "loves":
              resolveLoves(id, e.loves);
              break;
            case "step":
              draft.steps = [...draft.steps, e.step];
              break;
            case "candidates":
              draft.candidates = e.candidates;
              rememberTags(Object.fromEntries(e.candidates.flatMap((c) => c.tags.map((t) => [t.id, t.name]))));
              break;
            case "media":
              draft.media = e.media;
              break;
            case "plans":
              draft.plans = e.plans;
              draft.summary = e.summary;
              break;
            case "notice":
              draft.notices = [...draft.notices, e.message];
              break;
            case "error":
              draft.notices = [...draft.notices, e.message];
              toast.error("Planning stopped", { description: e.message });
              break;
          }
          setRun({ ...draft });
        }
      }
    } catch (err) {
      toast.error("Couldn't reach the planner", { description: err instanceof Error ? err.message : undefined });
    } finally {
      draft.finishedAt = new Date().toISOString();
      setRun({ ...draft });
      saveRun(id, draft);
      setRunning(false);
    }
  };

  const choose = (planIndex: number) => {
    if (!run) return;
    const plan = run.plans[planIndex];
    const c = run.candidates.find((x) => x.id === plan.candidateId);
    const m = run.media.find((x) => x.id === plan.candidateId);
    const place = c
      ? { id: c.id, name: c.name, address: c.address, category: c.category, tags: c.tags, priceLevel: c.priceLevel, lat: c.lat, lon: c.lon, source: c.source }
      : { id: m!.id, name: m!.name, category: "At home", tags: [], source: m!.source };
    const outing: Outing = {
      id: newId("outing"),
      personId: id,
      status: "planned",
      date: run.constraints.date,
      window: formatWindow(run.constraints.start, run.constraints.end),
      place,
      planTitle: plan.title,
      why: plan.why,
      supportNotes: plan.supportNotes,
      staff: currentStaff.short,
    };
    scheduleOuting(outing);
    toast.success("Added to today", {
      description: `${place.name} · ${outing.window}`,
      action: { label: "Log now", onClick: () => setLogging(outing) },
    });
  };

  const chosenFor = (candidateId: string) => outings.find((o) => o.place.id === candidateId && o.date === run?.constraints.date && !o.sample);
  const chosenIds = new Set(outings.filter((o) => o.status === "planned" && o.date === run?.constraints.date).map((o) => o.place.id));
  const showResults = Boolean(run && (running || run.steps.length));

  return (
    <Page wide>
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to record">
          <Link href={`/people/${id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <PersonAvatar person={person} size="md" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">Plan an outing with {person.firstName}</h1>
          <p className="truncate text-sm text-muted-foreground">{person.loves.map((l) => l.name).join(" · ")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4 text-muted-foreground" /> The shift
            </p>
            <ConstraintsForm value={constraints} onChange={setConstraints} onSubmit={start} running={running} />
          </div>
          {showResults && run && <AgentTrace steps={run.steps} mode={run.mode} running={running} />}
        </aside>

        <div ref={resultsRef} className="@container min-w-0 scroll-mt-6 space-y-5">
          {!showResults && <HowItWorks name={person.firstName} />}

          {run?.mode?.qloo === "sample" && (
            <Alert>
              <Database />
              <AlertTitle>Sample data</AlertTitle>
              <AlertDescription>Fictional places with simulated affinity. Add a Qloo API key to search real places.</AlertDescription>
            </Alert>
          )}
          {run?.notices.map((n) => (
            <Alert key={n}>
              <Info />
              <AlertDescription>{n}</AlertDescription>
            </Alert>
          ))}

          <AnimatePresence>
            {lesson && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 rounded-xl border border-lit/40 bg-lit-soft p-4"
              >
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-lit-strong" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">Learned from {lesson.place}</p>
                  <p className="text-muted-foreground">{[...lesson.lines, ...lesson.movers].join(" · ") || "Ranking updated."}</p>
                </div>
                <button type="button" onClick={() => setLesson(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {running && !run?.plans.length && (
            <div className="grid gap-4 @2xl:grid-cols-2">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          )}

          {run && run.plans.length > 0 && (
            <>
              {run.summary && <p className="text-[15px] text-muted-foreground">{run.summary}</p>}
              <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
                {run.plans.map((p, i) => (
                  <PlanCard
                    key={`${p.candidateId}-${i}`}
                    index={i}
                    plan={p}
                    candidate={run.candidates.find((c) => c.id === p.candidateId)}
                    media={run.media.find((m) => m.id === p.candidateId)}
                    scored={ranked.find((r) => r.candidate.id === p.candidateId)}
                    chosen={chosenFor(p.candidateId)}
                    needsAccess={person.support.mobility === "wheelchair"}
                    onChoose={() => choose(i)}
                    onLog={setLogging}
                  />
                ))}
              </div>
            </>
          )}

          {ranked.length > 0 && !running && <RankedList ranked={ranked} moves={moves} personName={person.firstName} chosenIds={chosenIds} />}
        </div>
      </div>

      <LogReactionDialog
        outing={logging}
        open={Boolean(logging)}
        onOpenChange={(o) => !o && setLogging(null)}
        onLogged={(o) => {
          pendingBefore.current = { order: ranked.map((r) => r.candidate.id), outing: o };
        }}
      />
    </Page>
  );
}

export default function PlanPage({ params }: PageProps<"/people/[id]/plan">) {
  const { id } = use(params);
  return (
    <Hydrated>
      <PlanView id={id} />
    </Hydrated>
  );
}
