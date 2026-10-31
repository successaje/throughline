"use client";

import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { radiusOptions } from "@/lib/geo";
import type { PlanConstraints, Transport } from "@/lib/types";

export function ConstraintsForm({
  value,
  onChange,
  onSubmit,
  running,
}: {
  value: PlanConstraints;
  onChange: (c: PlanConstraints) => void;
  onSubmit: () => void;
  running: boolean;
}) {
  const set = <K extends keyof PlanConstraints>(k: K, v: PlanConstraints[K]) => onChange({ ...value, [k]: v });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="date" className="text-[13px]">Day</Label>
        <Input id="date" type="date" value={value.date} onChange={(e) => set("date", e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start" className="text-[13px]">From</Label>
          <Input id="start" type="time" value={value.start} onChange={(e) => set("start", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end" className="text-[13px]">Until</Label>
          <Input id="end" type="time" value={value.end} onChange={(e) => set("end", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="budget" className="text-[13px]">Budget</Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="budget" type="number" min={0} max={500} className="pl-6" value={value.budget} onChange={(e) => set("budget", Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Distance</Label>
          <Select value={String(value.radiusKm)} onValueChange={(v) => set("radiusKm", Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions(value.radiusKm).map((km) => (
                <SelectItem key={km} value={String(km)}>
                  {Math.round(km * 0.621)} mi
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[13px]">Getting there</Label>
        <Select value={value.transport} onValueChange={(v) => set("transport", v as Transport)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="van">Agency van</SelectItem>
            <SelectItem value="bus">Bus</SelectItem>
            <SelectItem value="walk">Walking</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <span className="text-sm">
          Include an at-home idea
          <span className="block text-xs text-muted-foreground">For low-energy days</span>
        </span>
        <Switch checked={value.includeAtHome} onCheckedChange={(v) => set("includeAtHome", v)} />
      </label>
      <Button type="submit" size="lg" className="h-10 w-full" disabled={running}>
        {running ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Search data-icon="inline-start" />}
        {running ? "Finding outings" : "Find outings"}
      </Button>
    </form>
  );
}
