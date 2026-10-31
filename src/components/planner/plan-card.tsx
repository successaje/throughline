"use client";

import { motion } from "motion/react";
import { Accessibility, ArrowDown, ArrowUp, CalendarPlus, CheckCircle2, Clock, Home, PhoneCall, RotateCcw, Sparkles, Star } from "lucide-react";
import { ReactionBadge } from "@/components/reaction";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";
import { priceLabel } from "@/lib/format";
import type { Scored } from "@/lib/model";
import type { Candidate, MediaPick, Outing, Plan, PlanKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND: Record<PlanKind, { label: string; icon: React.ElementType; className: string }> = {
  regular: { label: "Proven favorite", icon: RotateCcw, className: "bg-lit-soft text-lit-strong" },
  new: { label: "Something new", icon: Sparkles, className: "bg-accent text-accent-foreground" },
  at_home: { label: "At home", icon: Home, className: "bg-muted text-muted-foreground" },
};

export function PlanCard({
  plan,
  candidate,
  media,
  scored,
  chosen,
  needsAccess,
  index,
  onChoose,
  onLog,
}: {
  plan: Plan;
  candidate?: Candidate;
  media?: MediaPick;
  scored?: Scored;
  chosen?: Outing;
  needsAccess: boolean;
  index: number;
  onChoose: () => void;
  onLog: (o: Outing) => void;
}) {
  const kind = KIND[plan.kind];
  const explain = (candidate ?? media)?.explain ?? [];
  const meta = candidate
    ? [candidate.category, formatDistance(candidate.distanceKm), priceLabel(candidate.priceLevel)].filter(Boolean)
    : media
      ? [media.year ? String(media.year) : undefined, media.type.includes("tv") ? "TV" : media.type.includes("artist") ? "Music" : "Film"].filter(Boolean)
      : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={cn("flex flex-col rounded-xl border bg-card", chosen && "border-primary/40 ring-3 ring-primary/10")}
    >
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium", kind.className)}>
            <kind.icon className="size-3.5" />
            {kind.label}
          </span>
          {candidate?.rating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <Star className="size-3 fill-current" />
              {candidate.rating.toFixed(1)}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-[17px] leading-snug font-semibold tracking-tight">{plan.title}</h3>
          {meta.length > 0 && <p className="mt-0.5 text-sm text-muted-foreground">{meta.join(" · ")}</p>}
        </div>
        <p className="text-[15px] leading-relaxed">{plan.why}</p>

        {(explain.length > 0 || (scored?.reasons.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {explain.slice(0, 2).map((e) => (
              <span key={e.id} className="inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs whitespace-nowrap" title="Qloo explainability: how much this love drove the match">
                <span className="text-muted-foreground">Qloo ·</span> {e.name}
                <span className="text-muted-foreground tabular-nums">{e.score.toFixed(2)}</span>
              </span>
            ))}
            {scored?.reasons.map((r) => (
              <span
                key={r.label}
                className={cn("inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs whitespace-nowrap", r.direction === "up" ? "bg-lit-soft text-lit-strong" : "bg-nope-soft text-nope")}
                title={`Learned from ${r.evidence} logged outings`}
              >
                {r.direction === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                {r.label}
              </span>
            ))}
          </div>
        )}

        {plan.supportNotes.length > 0 && (
          <ul className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
            {plan.supportNotes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                {n}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {plan.timing}
          </span>
          {candidate && needsAccess && (
            <span className={cn("flex items-center gap-1", !candidate.accessibilityListed && "text-lit-strong")}>
              {candidate.accessibilityListed ? <Accessibility className="size-3.5" /> : <PhoneCall className="size-3.5" />}
              {candidate.accessibilityListed ? "Step-free entrance listed" : "Access not listed, call ahead"}
            </span>
          )}
          {scored?.history && (
            <span>
              Been {scored.history.visits}× · lit up {scored.history.litUp}×
            </span>
          )}
        </div>
        {plan.backup && <p className="text-xs text-muted-foreground">Plan B: {plan.backup}</p>}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t px-4 py-3 sm:px-5">
        {chosen ? (
          chosen.status === "logged" && chosen.reaction ? (
            <span className="flex items-center gap-2 text-sm">
              <ReactionBadge reaction={chosen.reaction} /> Logged
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-sm text-primary">
                <CheckCircle2 className="size-4" /> Planned
              </span>
              <Button size="sm" className="ml-auto" onClick={() => onLog(chosen)}>
                Log how it went
              </Button>
            </>
          )
        ) : (
          <Button size="sm" variant={index === 0 ? "default" : "outline"} onClick={onChoose}>
            <CalendarPlus data-icon="inline-start" />
            Choose this plan
          </Button>
        )}
      </div>
    </motion.article>
  );
}
