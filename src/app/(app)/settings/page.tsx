"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Bot, CheckCircle2, CircleDashed, Lock, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { toast } from "sonner";
import { Hydrated, Page, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStatus } from "@/hooks/use-status";
import { useStore } from "@/lib/store";

function Row({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Integration({ ok, okLabel, offLabel }: { ok?: boolean; okLabel: string; offLabel: string }) {
  if (ok === undefined) return <span className="text-sm text-muted-foreground">Checking…</span>;
  return ok ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
      <CheckCircle2 className="size-4" /> {okLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <CircleDashed className="size-4" /> {offLabel}
    </span>
  );
}

function SettingsView() {
  const status = useStatus();
  const resetDemo = useStore((s) => s.resetDemo);
  const { theme, setTheme } = useTheme();
  const [confirm, setConfirm] = useState(false);

  return (
    <Page>
      <PageHeader title="Settings" description="Integrations, privacy and demo data." />

      <section className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Integrations</h2>
        <div className="divide-y">
          <Row
            title="Qloo taste intelligence"
            description={
              <>
                Finds real places and cross-domain picks. Set <code className="rounded bg-muted px-1 text-xs">QLOO_API_KEY</code> on the server. Without it, Throughline uses fictional sample places.
              </>
            }
          >
            <Integration ok={status ? status.qloo === "live" : undefined} okLabel="Live" offLabel="Sample data" />
          </Row>
          <Row
            title="Planning agent"
            description={
              <>
                Claude (or Gemini) reads the profile and history, calls Qloo, and writes the plans. Set <code className="rounded bg-muted px-1 text-xs">ANTHROPIC_API_KEY</code> or <code className="rounded bg-muted px-1 text-xs">GEMINI_API_KEY</code>. Without either, a rules planner uses the same searches and ranking.
              </>
            }
          >
            <Integration ok={status ? status.agent !== "rules" : undefined} okLabel={status?.model ?? "Connected"} offLabel="Rules planner" />
          </Row>
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Lock className="size-4 text-muted-foreground" /> What leaves this device
        </h2>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="w-16 shrink-0 font-medium">Qloo</span>
            <span className="text-muted-foreground">Entity and tag IDs for the person&apos;s loves, a map point and radius, the weekday and a price ceiling. Never names or support details.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-16 shrink-0 font-medium">Agent</span>
            <span className="text-muted-foreground">Claude or Gemini, whichever is configured, gets the profile with the name removed, pronouns, support notes and recent outing logs, to write plans and progress notes.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-16 shrink-0 font-medium">Storage</span>
            <span className="text-muted-foreground">Records are kept in this browser for the demo. A production deployment stores them per agency with access controls and audit logs.</span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="divide-y">
          <Row title="Appearance">
            <ToggleGroup type="single" variant="outline" value={theme} onValueChange={(v) => v && setTheme(v)}>
              <ToggleGroupItem value="light" aria-label="Light">
                <Sun />
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Dark">
                <Moon />
              </ToggleGroupItem>
              <ToggleGroupItem value="system" aria-label="System">
                <Monitor />
              </ToggleGroupItem>
            </ToggleGroup>
          </Row>
          <Row title="Reset demo data" description="Restores the four sample people and their sample history. Anything you added is removed.">
            <Button variant="outline" onClick={() => setConfirm(true)}>
              <RotateCcw data-icon="inline-start" />
              Reset
            </Button>
          </Row>
          <Row title="About" description="Throughline: community outings that fit the person, learned from how each one went, kept when staff change.">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="size-3.5" /> Qloo × {status?.agent === "gemini" ? "Gemini" : "Claude"}
            </span>
          </Row>
        </div>
      </section>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>Everything in this browser goes back to the sample people and history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemo();
                setConfirm(false);
                toast.success("Demo data restored");
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

export default function SettingsPage() {
  return (
    <Hydrated>
      <SettingsView />
    </Hydrated>
  );
}
