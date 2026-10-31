"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, Ban, ChevronDown, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistance } from "@/lib/geo";
import { priceLabel } from "@/lib/format";
import type { Scored } from "@/lib/model";
import { cn } from "@/lib/utils";

function ScoreBar({ s }: { s: Scored }) {
  // Visual split: Qloo taste share vs. what this person's logs added or removed.
  const qloo = Math.max(0, 0.55 * s.qloo);
  const learned = 0.45 * (0.5 + s.learned);
  const total = Math.max(0.01, Math.min(1.2, s.score));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:w-32" aria-label={`Fit ${Math.round(total * 100)}`}>
          <span className="h-full bg-primary/70" style={{ width: `${(qloo / 1.2) * 100}%` }} />
          <span className={cn("h-full", s.learned >= 0 ? "bg-lit" : "bg-nope/70")} style={{ width: `${(learned / 1.2) * 100}%` }} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        Qloo taste {Math.round(s.qloo * 100)} · Their logs {s.learned >= 0 ? "+" : ""}
        {Math.round(s.learned * 100)}
        {s.history?.litUp ? ` · Lit up ${s.history.litUp}×` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function RankedList({
  ranked,
  moves,
  personName,
  chosenIds,
}: {
  ranked: Scored[];
  moves: Record<string, number>;
  personName: string;
  chosenIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? ranked : ranked.slice(0, 8);
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Every option, ranked for {personName}</h2>
          <p className="text-xs text-muted-foreground">
            <span className="mr-1 inline-block size-2 rounded-full bg-primary/70" />
            Qloo taste affinity
            <span className="mr-1 ml-3 inline-block size-2 rounded-full bg-lit" />
            What their logs taught
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{ranked.length} places</span>
      </div>
      <motion.ol layout className="divide-y">
        {shown.map((s, i) => {
          const c = s.candidate;
          const move = moves[c.id] ?? 0;
          return (
            <motion.li
              key={c.id}
              layout
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className={cn("flex items-center gap-3 px-4 py-2.5", s.blocked && "opacity-55", move !== 0 && (move > 0 ? "bg-lit-soft/50" : "bg-nope-soft/50"))}
            >
              <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  <span className="truncate">{c.name}</span>
                  {chosenIds.has(c.id) && <span className="rounded bg-accent px-1.5 text-[10px] font-medium text-accent-foreground">Planned</span>}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {s.blocked ? (
                    <span className="flex items-center gap-1 text-nope">
                      <Ban className="size-3" /> {s.blocked}
                    </span>
                  ) : s.flagged ? (
                    <span className="flex items-center gap-1 text-nope">
                      <Flag className="size-3" /> {s.flagged}
                    </span>
                  ) : (
                    [c.category, formatDistance(c.distanceKm), priceLabel(c.priceLevel), c.explain[0] && `via ${c.explain[0].name}`].filter(Boolean).join(" · ")
                  )}
                </p>
              </div>
              {move !== 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn("flex items-center text-xs font-medium tabular-nums", move > 0 ? "text-lit-strong" : "text-nope")}
                >
                  {move > 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                  {Math.abs(move)}
                </motion.span>
              )}
              <ScoreBar s={s} />
            </motion.li>
          );
        })}
      </motion.ol>
      {ranked.length > 8 && (
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded((e) => !e)}>
            <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} data-icon="inline-start" />
            {expanded ? "Show fewer" : `Show all ${ranked.length}`}
          </Button>
        </div>
      )}
    </section>
  );
}
