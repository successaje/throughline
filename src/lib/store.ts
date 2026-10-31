"use client";

// The record lives in this browser for the demo. Production would persist it
// per agency on a server so it survives devices and staff changes.

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AgentStep,
  Candidate,
  Love,
  MediaPick,
  Outing,
  Person,
  Plan,
  PlanConstraints,
  Reaction,
  ReactionTag,
  RunMode,
} from "./types";
import { CURRENT_STAFF, seedOutings, seedPeople } from "./sample/seed";

export interface PlanRun {
  constraints: PlanConstraints;
  mode?: RunMode;
  steps: AgentStep[];
  candidates: Candidate[];
  media: MediaPick[];
  plans: Plan[];
  summary: string;
  notices: string[];
  seed: number;
  finishedAt?: string;
}

interface State {
  people: Person[];
  outings: Outing[];
  runs: Record<string, PlanRun>;
  tagNames: Record<string, string>;
  addPerson: (p: Person) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  resolveLoves: (personId: string, loves: Love[]) => void;
  saveRun: (personId: string, run: PlanRun) => void;
  scheduleOuting: (o: Outing) => void;
  logOuting: (id: string, reaction: Reaction, tags: ReactionTag[], note?: string) => void;
  deleteOuting: (id: string) => void;
  rememberTags: (names: Record<string, string>) => void;
  resetDemo: () => void;
}

const initial = () => ({
  people: seedPeople(),
  outings: seedOutings(),
  runs: {} as Record<string, PlanRun>,
  tagNames: {} as Record<string, string>,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial(),
      addPerson: (p) => set((s) => ({ people: [...s.people, p] })),
      updatePerson: (id, patch) =>
        set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePerson: (id) =>
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          outings: s.outings.filter((o) => o.personId !== id),
        })),
      resolveLoves: (personId, loves) =>
        set((s) => ({ people: s.people.map((p) => (p.id === personId ? { ...p, loves } : p)) })),
      saveRun: (personId, run) => set((s) => ({ runs: { ...s.runs, [personId]: run } })),
      scheduleOuting: (o) => set((s) => ({ outings: [...s.outings, o] })),
      logOuting: (id, reaction, tags, note) =>
        set((s) => ({
          outings: s.outings.map((o) =>
            o.id === id
              ? { ...o, status: "logged", reaction, reactionTags: tags, note: note || o.note, loggedAt: new Date().toISOString() }
              : o,
          ),
        })),
      deleteOuting: (id) => set((s) => ({ outings: s.outings.filter((o) => o.id !== id) })),
      rememberTags: (names) => set((s) => ({ tagNames: { ...s.tagNames, ...names } })),
      resetDemo: () => set(initial()),
    }),
    {
      name: "throughline",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** True once the persisted store has loaded, to avoid hydration mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const done = () => setHydrated(true);
    if (useStore.persist.hasHydrated()) done();
    return useStore.persist.onFinishHydration(done);
  }, []);
  return hydrated;
}

export function usePerson(id: string) {
  return useStore((s) => s.people.find((p) => p.id === id));
}

export function useOutings(personId: string) {
  const outings = useStore((s) => s.outings);
  return outings.filter((o) => o.personId === personId).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const currentStaff = CURRENT_STAFF;

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
