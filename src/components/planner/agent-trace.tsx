"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Bot, Check, ChevronRight, Loader2, Workflow } from "lucide-react";
import type { AgentStep, RunMode } from "@/lib/types";
import { cn } from "@/lib/utils";

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "running") return <Loader2 className="size-3.5 animate-spin text-primary" />;
  if (status === "error") return <AlertCircle className="size-3.5 text-destructive" />;
  return <Check className="size-3.5 text-primary" />;
}

function Step({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.li layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="relative pl-7">
      <span className="absolute top-0.5 left-0 flex size-5 items-center justify-center rounded-full border bg-card">
        <StepIcon status={step.status} />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className={cn("text-sm font-medium", step.status === "running" && "text-foreground")}>{step.label}</p>
        {step.resultCount !== undefined && step.status === "done" && (
          <span className="text-xs text-muted-foreground tabular-nums">{step.resultCount} results</span>
        )}
      </div>
      {step.detail && <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>}
      {step.request && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline" aria-expanded={open}>
            <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
            Qloo request
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.pre
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-1.5 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed"
              >
                <span className="text-primary">{step.request.endpoint}</span>
                {Object.entries(step.request.params).map(([k, v]) => (
                  <span key={k} className="block">
                    <span className="text-muted-foreground">{k}=</span>
                    {v}
                  </span>
                ))}
              </motion.pre>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.li>
  );
}

export function AgentTrace({ steps, mode, running }: { steps: AgentStep[]; mode?: RunMode; running: boolean }) {
  // Steps arrive as running, then again as done/error with the same id.
  const merged = [...new Map(steps.map((s) => [s.id, s])).values()];
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {mode?.agent === "claude" ? <Bot className="size-4 text-primary" /> : <Workflow className="size-4 text-primary" />}
          {mode?.agent === "claude" ? "Agent run" : "Planner run"}
        </p>
        <span className="text-xs text-muted-foreground">
          {mode ? `${mode.qloo === "live" ? "Live Qloo" : "Sample data"} · ${mode.agent === "claude" ? "Claude agent" : "Rules planner"}` : running ? "Starting" : ""}
        </span>
      </div>
      <ol className="space-y-3.5 before:absolute">
        {merged.map((s) => (
          <Step key={s.id} step={s} />
        ))}
        {running && merged.every((s) => s.status !== "running") && (
          <li className="relative pl-7 text-sm text-muted-foreground">
            <span className="absolute top-0.5 left-0 flex size-5 items-center justify-center rounded-full border bg-card">
              <Loader2 className="size-3.5 animate-spin" />
            </span>
            Thinking about the options
          </li>
        )}
      </ol>
    </div>
  );
}
