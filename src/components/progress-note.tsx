"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { TAG_LABEL } from "@/components/reaction";
import { Button } from "@/components/ui/button";
import { REACTION_LABEL, formatDate, pronoun } from "@/lib/format";
import { historyByPlace, insights, learn } from "@/lib/model";
import type { Outing, Person } from "@/lib/types";

const DAYS = 30;

/** Template note used when no Claude key is configured. Cites logs the same way. */
function templateNote(person: Person, logs: (Outing & { n: number })[]) {
  const pr = pronoun(person);
  const lit = logs.filter((o) => o.reaction === "lit_up");
  const nope = logs.filter((o) => o.reaction === "not_for_them");
  const fav = Object.values(historyByPlace(logs)).sort((a, b) => b.litUp - a.litUp)[0];
  const likes = insights(learn(logs)).likes.slice(0, 2).map((l) => l.label.toLowerCase());
  const cite = (list: { n: number }[]) => `[${list.map((o) => o.n).join(", ")}]`;
  const parts = [
    `${person.firstName} took part in ${logs.length} community outing${logs.length === 1 ? "" : "s"} in the last ${DAYS} days ${cite(logs)}.`,
    lit.length ? `${pr.Subj} was visibly engaged on ${lit.length} of them ${cite(lit)}${fav?.litUp ? `, most often at ${fav.last?.place.name}` : ""}.` : "",
    nope.length ? `${nope.length} outing${nope.length === 1 ? " was" : "s were"} not a good fit ${cite(nope)}${nope.some((o) => o.reactionTags?.includes("too_loud")) ? ", mainly because of noise" : ""}.` : "",
    `Next steps: keep offering places like those that worked, and try one new place each week${likes.length ? ` that shares what has worked so far (${likes.join(", ")})` : ""}.`,
  ];
  return parts.filter(Boolean).join(" ");
}

type Numbered = Outing & { n: number };

function recentLogs(outings: Outing[], now: number): Numbered[] {
  const d = new Date(now - DAYS * 86_400_000);
  const since = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return outings
    .filter((o) => o.status === "logged" && o.date >= since)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((o, i) => ({ ...o, n: i + 1 }));
}

/** Mounted only while the dialog is open, so each open drafts afresh. */
function NoteBody({ person, logs }: { person: Person; logs: Numbered[] }) {
  const [state, setState] = useState<{ loading: boolean; text: string; mode: "claude" | "rules" | null }>({ loading: true, text: "", mode: null });

  useEffect(() => {
    let alive = true;
    const fallback = () => alive && setState({ loading: false, text: templateNote(person, logs), mode: "rules" });
    fetch("/api/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pronouns: person.pronouns,
        outings: logs.map((o) => ({ n: o.n, date: o.date, place: o.place.name, reaction: o.reaction, tags: o.reactionTags ?? [], note: o.note?.replaceAll(person.firstName, "{{name}}") })),
      }),
    })
      .then((r) => r.json())
      .then((d: { mode: "claude" | "rules"; text?: string }) => {
        if (!alive) return;
        if (d.mode === "claude" && d.text) setState({ loading: false, text: d.text.replaceAll("{{name}}", person.firstName), mode: "claude" });
        else fallback();
      })
      .catch(fallback);
    return () => {
      alive = false;
    };
  }, [person, logs]);

  const { loading, text, mode } = state;
  return (
    <div className="space-y-4">
      <div className="min-h-32 rounded-lg border bg-muted/40 p-4 text-[15px] leading-relaxed whitespace-pre-wrap">
        {loading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Drafting from the logs
          </span>
        ) : (
          text
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {mode === "claude" && <Sparkles className="size-3.5" />}
          {mode === "claude" ? "Drafted by Claude from the logs" : mode === "rules" ? "Template draft. Add a Claude key for a written draft." : ""}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || !text}
          onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"))}
        >
          <Copy data-icon="inline-start" />
          Copy
        </Button>
      </div>
      <ol className="max-h-56 space-y-1.5 overflow-y-auto border-t pt-3 text-xs text-muted-foreground">
        {logs.map((o) => (
          <li key={o.id} className="flex gap-2">
            <span className="w-5 shrink-0 text-right font-medium text-foreground tabular-nums">[{o.n}]</span>
            <span>
              {formatDate(o.date)} · {o.place.name} · {REACTION_LABEL[o.reaction!]}
              {o.reactionTags?.length ? ` · ${o.reactionTags.map((t) => TAG_LABEL[t]).join(", ")}` : ""} · {o.staff}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProgressNoteDialog({ person, outings, open, onOpenChange }: { person: Person; outings: Outing[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [now] = useState(() => Date.now());
  const logs = useMemo(() => recentLogs(outings, now), [outings, now]);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Draft progress note"
      description={`Built only from ${logs.length} outings logged in the last ${DAYS} days. Numbers in brackets point to the log entries below. Review before filing.`}
      className="sm:max-w-2xl"
    >
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No outings logged in the last {DAYS} days.</p>
      ) : (
        open && <NoteBody person={person} logs={logs} />
      )}
    </ResponsiveDialog>
  );
}
