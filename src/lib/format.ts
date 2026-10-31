import type { Person, Reaction } from "./types";

/** "13:30" → "1:30 pm" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const formatWindow = (start: string, end: string) => `${formatTime(start)}–${formatTime(end)}`;

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
}

export function relativeDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((today - then) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days < -1 && days > -7) return `In ${-days} days`;
  return formatDate(iso);
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fullName = (p: Pick<Person, "firstName" | "lastName">) => `${p.firstName} ${p.lastName}`;
export const initials = (p: Pick<Person, "firstName" | "lastName">) => `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`;

export function pronoun(p: Pick<Person, "pronouns">) {
  switch (p.pronouns) {
    case "she/her":
      return { subj: "she", obj: "her", pos: "her", Subj: "She", Pos: "Her" };
    case "he/him":
      return { subj: "he", obj: "him", pos: "his", Subj: "He", Pos: "His" };
    default:
      return { subj: "they", obj: "them", pos: "their", Subj: "They", Pos: "Their" };
  }
}

export const REACTION_LABEL: Record<Reaction, string> = {
  lit_up: "Lit up",
  fine: "It was fine",
  not_for_them: "Not for them",
};

export const priceLabel = (level?: number) => (level ? "$".repeat(level) : undefined);
