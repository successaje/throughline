import { Frown, Meh, Sparkles, type LucideIcon } from "lucide-react";
import { REACTION_LABEL } from "@/lib/format";
import type { Reaction, ReactionTag } from "@/lib/types";
import { cn } from "@/lib/utils";

export const REACTION_ICON: Record<Reaction, LucideIcon> = {
  lit_up: Sparkles,
  fine: Meh,
  not_for_them: Frown,
};

export const REACTION_STYLE: Record<Reaction, string> = {
  lit_up: "bg-lit-soft text-lit-strong",
  fine: "bg-fine-soft text-fine",
  not_for_them: "bg-nope-soft text-nope",
};

export const TAG_LABEL: Record<ReactionTag, string> = {
  too_loud: "Too loud",
  too_crowded: "Too crowded",
  wanted_to_stay: "Wanted to stay",
  left_early: "Left early",
  tried_something_new: "Tried something new",
  social_moment: "Connected with someone",
  ate_well: "Ate well",
  calm: "Calm the whole time",
  tired: "Got tired",
};

export function ReactionBadge({ reaction, className, iconOnly }: { reaction: Reaction; className?: string; iconOnly?: boolean }) {
  const Icon = REACTION_ICON[reaction];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium",
        iconOnly && "w-6 justify-center px-0",
        REACTION_STYLE[reaction],
        className,
      )}
      title={REACTION_LABEL[reaction]}
    >
      <Icon className="size-3.5" />
      {!iconOnly && REACTION_LABEL[reaction]}
    </span>
  );
}
