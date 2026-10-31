"use client";

import { Fragment } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { ReactionBadge, TAG_LABEL } from "@/components/reaction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import { historyByPlace, insights, learn, tagNameIndex, type Learned } from "@/lib/model";
import { useStore } from "@/lib/store";
import type { Outing } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useLearned(outings: Outing[]) {
  const tagNames = useStore((s) => s.tagNames);
  return insights(learn(outings), { ...tagNameIndex(outings.map((o) => o.place)), ...tagNames });
}

/** A learned trait with a confidence bar. Mean 0..1 maps to the bar. */
export function LearnedRow({ item, tone }: { item: Learned; tone: "up" | "down" }) {
  const pct = Math.round((tone === "up" ? item.mean : 1 - item.mean) * 100);
  return (
    <div className="grid grid-cols-[1fr_88px_auto] items-center gap-3 py-1.5 text-sm">
      <span className="truncate">{item.label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", tone === "up" ? "bg-lit" : "bg-nope")} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">
        {Math.round(item.evidence)} outing{Math.round(item.evidence) === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export function FavoritePlaces({ outings, limit = 5 }: { outings: Outing[]; limit?: number }) {
  const hist = Object.values(historyByPlace(outings))
    .filter((h) => h.litUp > 0)
    .sort((a, b) => b.litUp - a.litUp || b.visits - a.visits)
    .slice(0, limit);
  if (!hist.length) return <p className="text-sm text-muted-foreground">No favorites yet. Log a few outings and they appear here.</p>;
  return (
    <ul className="space-y-2.5">
      {hist.map((h) => {
        const visits = outings.filter((o) => o.status === "logged" && o.place.id === h.last!.place.id).sort((a, b) => (a.date < b.date ? -1 : 1));
        return (
          <li key={h.last!.place.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{h.last!.place.name}</p>
              <p className="truncate text-xs text-muted-foreground">{h.last!.place.category}</p>
            </div>
            <div className="flex items-center gap-1" aria-label={`${h.litUp} of ${h.visits} visits lit up`}>
              {visits.map((v) => (
                <span key={v.id} className={cn("size-2 rounded-full", v.reaction === "lit_up" ? "bg-lit" : v.reaction === "fine" ? "bg-fine/40" : "bg-nope")} />
              ))}
            </div>
            <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
              {h.litUp}/{h.visits} lit up
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function OutingRow({ outing, onLog, compact }: { outing: Outing; onLog?: (o: Outing) => void; compact?: boolean }) {
  const deleteOuting = useStore((s) => s.deleteOuting);
  return (
    <li className="flex gap-3 py-3.5">
      <div className="w-14 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">{formatDate(outing.date, { month: "short", day: "numeric" })}</div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{outing.place.name}</span>
          {outing.status === "logged" && outing.reaction ? <ReactionBadge reaction={outing.reaction} /> : <Badge variant="outline">Planned</Badge>}
          {outing.sample && (
            <Badge variant="outline" className="text-muted-foreground">
              Sample
            </Badge>
          )}
        </div>
        {!compact && outing.reactionTags && outing.reactionTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {outing.reactionTags.map((t) => (
              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {TAG_LABEL[t]}
              </span>
            ))}
          </div>
        )}
        {outing.note && <p className="text-sm text-muted-foreground">“{outing.note}”</p>}
        <p className="text-xs text-muted-foreground">
          {outing.staff}
          {outing.window ? ` · ${outing.window}` : ""}
          {outing.place.category ? ` · ${outing.place.category}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-start gap-1">
        {outing.status === "planned" && onLog && (
          <Button size="sm" onClick={() => onLog(outing)}>
            Log reaction
          </Button>
        )}
        {!compact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Outing actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => deleteOuting(outing.id)}>
                <Trash2 />
                Delete entry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

export function OutingTimeline({ outings, onLog }: { outings: Outing[]; onLog?: (o: Outing) => void }) {
  const groups = new Map<string, Outing[]>();
  for (const o of outings) {
    const key = formatDate(o.date, { month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([month, list]) => (
        <Fragment key={month}>
          <div>
            <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{month}</h3>
            <ul className="divide-y">
              {list.map((o) => (
                <OutingRow key={o.id} outing={o} onLog={onLog} />
              ))}
            </ul>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
