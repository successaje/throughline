"use client";

import { useState } from "react";
import { Check, LocateFixed } from "lucide-react";
import { LovesEditor } from "@/components/loves-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { radiusOptions } from "@/lib/geo";
import { AVOID_LABELS } from "@/lib/model";
import type { AvoidRule, HomeBase, Person } from "@/lib/types";
import { cn } from "@/lib/utils";

const AREAS: HomeBase[] = [
  { label: "Clintonville, Columbus OH", lat: 40.042, lon: -83.0186 },
  { label: "Downtown Columbus OH", lat: 39.9612, lon: -82.9988 },
  { label: "Westerville OH", lat: 40.1262, lon: -82.9291 },
  { label: "Brooklyn, New York NY", lat: 40.6782, lon: -73.9442 },
  { label: "Austin TX", lat: 30.2672, lon: -97.7431 },
  { label: "Portland OR", lat: 45.5152, lon: -122.6784 },
];

export function blankPerson(): Person {
  return {
    id: `p-${Math.random().toString(36).slice(2, 9)}`,
    firstName: "",
    lastName: "",
    pronouns: "they/them",
    age: 30,
    hue: Math.floor(Math.random() * 360),
    summary: "",
    home: AREAS[0],
    loves: [],
    avoid: [],
    support: { mobility: "none", communication: "", signsHappy: "", signsDistress: "", staffRatio: "1:1" },
    defaults: { budget: 20, radiusKm: 16, transport: "van" },
    createdAt: new Date().toISOString(),
  };
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[13px]">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-8">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PersonForm({ initial, submitLabel, onSubmit, onCancel }: { initial: Person; submitLabel: string; onSubmit: (p: Person) => void; onCancel?: () => void }) {
  const [p, setP] = useState<Person>(initial);
  const [locating, setLocating] = useState(false);
  const set = <K extends keyof Person>(k: K, v: Person[K]) => setP((cur) => ({ ...cur, [k]: v }));
  const setSupport = <K extends keyof Person["support"]>(k: K, v: Person["support"][K]) => setP((cur) => ({ ...cur, support: { ...cur.support, [k]: v } }));
  const setDefaults = <K extends keyof Person["defaults"]>(k: K, v: Person["defaults"][K]) => setP((cur) => ({ ...cur, defaults: { ...cur.defaults, [k]: v } }));
  const toggleAvoid = (a: AvoidRule) => set("avoid", p.avoid.includes(a) ? p.avoid.filter((x) => x !== a) : [...p.avoid, a]);
  const areas = AREAS.some((a) => a.label === p.home.label) ? AREAS : [p.home, ...AREAS];
  const valid = p.firstName.trim() && p.lastName.trim();

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("home", { label: "Current location", lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...p, firstName: p.firstName.trim(), lastName: p.lastName.trim() });
      }}
    >
      <Group title="About" description="What a new staff member should know first.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input value={p.firstName} onChange={(e) => set("firstName", e.target.value)} required autoFocus={!initial.firstName} />
          </Field>
          <Field label="Last name">
            <Input value={p.lastName} onChange={(e) => set("lastName", e.target.value)} required />
          </Field>
          <Field label="Age">
            <Input type="number" min={18} max={110} value={p.age} onChange={(e) => set("age", Number(e.target.value))} />
          </Field>
          <Field label="Pronouns">
            <Select value={p.pronouns} onValueChange={(v) => set("pronouns", v as Person["pronouns"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="she/her">she/her</SelectItem>
                <SelectItem value="he/him">he/him</SelectItem>
                <SelectItem value="they/them">they/them</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="In a sentence" hint="What lights them up, and what's hard. Written with them or their family.">
          <Textarea value={p.summary} onChange={(e) => set("summary", e.target.value)} rows={2} placeholder="Loves horses and Selena. Busy, noisy rooms wear them out." />
        </Field>
        <Field label="Home area" hint="Searches stay within the travel distance of this point.">
          <div className="flex gap-2">
            <Select value={p.home.label} onValueChange={(v) => set("home", areas.find((a) => a.label === v)!)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.label} value={a.label}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={locate} disabled={locating} aria-label="Use current location">
              <LocateFixed className={cn(locating && "animate-pulse")} />
            </Button>
          </div>
        </Field>
      </Group>

      <Group title="Loves" description="Specific beats general. A named artist or film gives Qloo much more to work with than “music”.">
        <LovesEditor loves={p.loves} onChange={(l) => set("loves", l)} />
      </Group>

      <Group title="Always avoid" description="Hard rules. Matching places are pushed down and flagged.">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AVOID_LABELS) as AvoidRule[]).map((a) => {
            const on = p.avoid.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAvoid(a)}
                className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm transition-colors hover:bg-muted", on && "border-nope/50 bg-nope-soft text-nope hover:bg-nope-soft")}
              >
                {on && <Check className="size-3.5" />}
                {AVOID_LABELS[a]}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="How to support" description="Shown on every plan and on the handoff card.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobility">
            <Select value={p.support.mobility} onValueChange={(v) => setSupport("mobility", v as Person["support"]["mobility"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Walks independently</SelectItem>
                <SelectItem value="cane">Uses a cane</SelectItem>
                <SelectItem value="walker">Uses a walker</SelectItem>
                <SelectItem value="wheelchair">Uses a wheelchair</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Staff ratio">
            <Select value={p.support.staffRatio} onValueChange={(v) => setSupport("staffRatio", v as Person["support"]["staffRatio"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="1:2">1:2</SelectItem>
                <SelectItem value="1:3">1:3</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Communication">
          <Textarea value={p.support.communication} onChange={(e) => setSupport("communication", e.target.value)} rows={2} placeholder="How they communicate, and how to offer choices." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Signs they're enjoying it">
            <Textarea value={p.support.signsHappy} onChange={(e) => setSupport("signsHappy", e.target.value)} rows={2} />
          </Field>
          <Field label="Signs it's too much">
            <Textarea value={p.support.signsDistress} onChange={(e) => setSupport("signsDistress", e.target.value)} rows={2} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Diet">
            <Input value={p.support.dietary ?? ""} onChange={(e) => setSupport("dietary", e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Anything else">
            <Input value={p.support.other ?? ""} onChange={(e) => setSupport("other", e.target.value)} placeholder="Optional" />
          </Field>
        </div>
      </Group>

      <Group title="Outing defaults" description="Pre-filled on every plan. Staff can change them per shift.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Budget per outing">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input type="number" min={0} max={500} className="pl-6" value={p.defaults.budget} onChange={(e) => setDefaults("budget", Number(e.target.value))} />
            </div>
          </Field>
          <Field label="Max distance">
            <Select value={String(p.defaults.radiusKm)} onValueChange={(v) => setDefaults("radiusKm", Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions(p.defaults.radiusKm).map((km) => (
                  <SelectItem key={km} value={String(km)}>
                    {Math.round(km * 0.621)} miles
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Getting there">
            <Select value={p.defaults.transport} onValueChange={(v) => setDefaults("transport", v as Person["defaults"]["transport"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="van">Agency van</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="walk">Walking</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Group>

      <div className="sticky bottom-20 z-10 -mx-1 mt-2 flex justify-end gap-2 rounded-xl border bg-background/90 p-2 backdrop-blur md:bottom-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
