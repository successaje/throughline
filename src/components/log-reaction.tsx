"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { REACTION_ICON, TAG_LABEL } from "@/components/reaction";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REACTION_LABEL, pronoun } from "@/lib/format";
import { lessonOf } from "@/lib/model";
import { useStore } from "@/lib/store";
import type { Outing, Reaction, ReactionTag } from "@/lib/types";
import { cn } from "@/lib/utils";

const REACTIONS: { value: Reaction; hint: string; active: string }[] = [
  { value: "lit_up", hint: "Smiling, engaged, wanted more", active: "border-lit bg-lit-soft text-lit-strong ring-lit/30" },
  { value: "fine", hint: "Okay, nothing special", active: "border-fine bg-fine-soft text-foreground ring-fine/25" },
  { value: "not_for_them", hint: "Upset, bored, or wanted to leave", active: "border-nope bg-nope-soft text-nope ring-nope/25" },
];

const TAGS: ReactionTag[] = [
  "wanted_to_stay",
  "calm",
  "social_moment",
  "tried_something_new",
  "ate_well",
  "too_loud",
  "too_crowded",
  "left_early",
  "tired",
];

export function LogReactionDialog({
  outing,
  open,
  onOpenChange,
  onLogged,
}: {
  outing: Outing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged?: (outing: Outing) => void;
}) {
  const logOuting = useStore((s) => s.logOuting);
  const person = useStore((s) => s.people.find((p) => p.id === outing?.personId));
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [tags, setTags] = useState<ReactionTag[]>([]);
  const [note, setNote] = useState("");

  const reset = () => {
    setReaction(null);
    setTags([]);
    setNote("");
  };

  if (!outing || !person) return null;
  const pr = pronoun(person);

  const save = () => {
    if (!reaction) return;
    logOuting(outing.id, reaction, tags, note.trim() || undefined);
    const logged: Outing = { ...outing, status: "logged", reaction, reactionTags: tags, note: note.trim() || outing.note };
    const lessons = lessonOf(logged);
    toast.success(`Saved to ${person.firstName}'s record`, {
      description: lessons.length ? lessons.join(" · ") : "Ranking updated.",
    });
    onLogged?.(logged);
    onOpenChange(false);
    reset();
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      title={`How did ${outing.place.name} go?`}
      description={`Ten seconds is enough. What you log decides what ${person.firstName} is offered next.`}
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Reaction" className="grid grid-cols-3 gap-2">
          {REACTIONS.map((r) => {
            const Icon = REACTION_ICON[r.value];
            const selected = reaction === r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setReaction(r.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border bg-card px-2 py-4 text-center transition-all outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && cn("ring-3", r.active),
                )}
              >
                <Icon className="size-7" strokeWidth={1.75} />
                <span className="text-sm font-semibold">{REACTION_LABEL[r.value]}</span>
                <span className="hidden text-[11px] leading-snug text-muted-foreground sm:block">{r.hint}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {reaction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5 overflow-hidden"
            >
              <div>
                <p className="mb-2 text-sm font-medium">Anything that stood out? <span className="font-normal text-muted-foreground">Optional</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => {
                    const on = tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))}
                        className={cn(
                          "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] transition-colors hover:bg-muted",
                          on && "border-primary bg-accent text-accent-foreground hover:bg-accent",
                        )}
                      >
                        {on && <Check className="size-3.5" />}
                        {TAG_LABEL[t]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label htmlFor="log-note" className="mb-2 block text-sm font-medium">
                  One line for the next person <span className="font-normal text-muted-foreground">Optional</span>
                </label>
                <Textarea
                  id="log-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={`e.g. ${pr.Subj} loved feeding the goats. Go before 2pm, it gets busy.`}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button size="lg" className="h-11 w-full text-[15px]" disabled={!reaction} onClick={save}>
          Save reaction
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
