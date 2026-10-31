import "server-only";

// Deterministic planner. Used when no Claude key is configured, and as the
// safety net if the agent fails. Same Qloo searches, same ranking model.

import type { Candidate, MediaPick, Plan } from "../types";
import { explorePick, type Scored } from "../model";
import { formatTime, pronoun } from "../format";
import type { Session } from "./session";

const ENTITY_MEDIA = new Set(["urn:entity:movie", "urn:entity:tv_show", "urn:entity:artist", "urn:entity:book"]);

export async function gatherDefault(s: Session) {
  if (!s.candidates.size) {
    await s.searchPlaces("Places that fit their loves", s.loves.map((l) => l.id));
  }
  if (s.req.constraints.includeAtHome && !s.media.size) {
    const signals = s.loves.filter((l) => l.kind === "entity" || ENTITY_MEDIA.has(l.type)).map((l) => l.id);
    await s.searchMedia("movie", signals).catch(() => []);
  }
}

export function supportNotes(s: Session, c?: Candidate): string[] {
  const p = s.person;
  const notes: string[] = [];
  const sentences = p.support.communication.split(/(?<=\.)\s/).filter(Boolean);
  // The actionable part ("Give two choices…") usually follows the description.
  const tip = sentences.find((line) => /^(give|offer|show|sit|use|ask|speak|let|wait)/i.test(line)) ?? sentences.slice(0, 2).join(" ");
  if (tip) notes.push(tip);
  if (p.support.signsDistress) notes.push(`Watch for: ${p.support.signsDistress.replace(/\.$/, "").toLowerCase()}. Have a quiet exit ready.`);
  if (c && p.support.mobility === "wheelchair" && !c.accessibilityListed) notes.push("Step-free access isn't listed. Call ahead.");
  if (p.support.dietary && c && /restaurant|taquer|cafe|food|market|wings/i.test(`${c.category} ${c.name}`)) notes.push(p.support.dietary);
  return notes.slice(0, 3);
}

function timing(s: Session, c?: Candidate) {
  const { start, end, transport } = s.req.constraints;
  if (!c?.distanceKm) return `${formatTime(start)}–${formatTime(end)}`;
  const speed = transport === "walk" ? 4.5 : transport === "bus" ? 18 : 35;
  const mins = Math.max(5, Math.round((c.distanceKm / speed) * 60 / 5) * 5);
  return `${formatTime(start)}–${formatTime(end)} · about ${mins} min by ${transport}`;
}

const lovesFor = (c: { explain: { name: string }[] }) => c.explain.slice(0, 2).map((e) => e.name);

export function rulesPlan(s: Session): { plans: Plan[]; summary: string } {
  const ranked = s.ranked().filter((r) => !r.blocked);
  const pr = pronoun(s.person);
  const plans: Plan[] = [];

  // A proven favorite is the place they have lit up at most, not just the top score.
  const favorites = ranked.filter((r) => r.history?.litUp && !r.flagged).sort((a, b) => b.history!.litUp - a.history!.litUp || b.score - a.score);
  const regular: Scored | undefined = favorites[0] ?? ranked.find((r) => !r.flagged);
  if (regular) {
    const c = regular.candidate;
    const h = regular.history;
    const loves = lovesFor(c);
    plans.push({
      kind: h?.litUp ? "regular" : "new",
      candidateId: c.id,
      title: h?.litUp ? `Back to ${c.name}` : `Try ${c.name}`,
      why: [
        h?.litUp ? `${pr.Subj} lit up here ${h.litUp === 1 ? "once" : `${h.litUp} times`}.` : undefined,
        loves.length ? `Qloo links it to ${pr.pos} love of ${loves.join(" and ")}.` : undefined,
        regular.reasons.find((r) => r.direction === "up") ? `It matches what has worked: ${regular.reasons.filter((r) => r.direction === "up").map((r) => r.label.toLowerCase()).join(", ")}.` : undefined,
      ].filter(Boolean).join(" "),
      supportNotes: supportNotes(s, c),
      timing: timing(s, c),
    });
  }

  const fresh = explorePick(ranked, s.req.outings, s.req.seed);
  if (fresh && fresh.candidate.id !== regular?.candidate.id) {
    const c = fresh.candidate;
    const loves = lovesFor(c);
    plans.push({
      kind: "new",
      candidateId: c.id,
      title: `Try ${c.name}`,
      why: [
        `Somewhere new to learn from.`,
        loves.length ? `Qloo connects it to ${loves.join(" and ")}.` : undefined,
        fresh.reasons.find((r) => r.direction === "up") ? `Shares ${fresh.reasons.filter((r) => r.direction === "up").map((r) => r.label.toLowerCase()).join(" and ")} with places ${pr.subj} enjoyed.` : undefined,
      ].filter(Boolean).join(" "),
      supportNotes: supportNotes(s, c),
      timing: timing(s, c),
      backup: regular ? `If it's not working, ${regular.candidate.name} is a known good fallback.` : undefined,
    });
  }

  const media: MediaPick | undefined = [...s.media.values()].sort((a, b) => b.affinity - a.affinity)[0];
  if (s.req.constraints.includeAtHome && media) {
    plans.push({
      kind: "at_home",
      candidateId: media.id,
      title: `Watch ${media.name}${media.year ? ` (${media.year})` : ""} together`,
      why: media.explain.length ? `For a low-energy day. Qloo pairs it with ${lovesFor(media).join(" and ")}.` : "For a low-energy day at home.",
      supportNotes: supportNotes(s).slice(0, 1),
      timing: "Any time",
    });
  }

  const summary = plans.length
    ? `${plans.length} options for ${formatTime(s.req.constraints.start)}: ${plans.filter((p) => p.kind === "regular").length ? "one proven favorite, " : ""}${plans.filter((p) => p.kind === "new").length ? "one new place to learn from" : ""}${plans.some((p) => p.kind === "at_home") ? ", and an at-home backup" : ""}.`
    : "No places matched these limits. Try a wider radius or a different day.";
  return { plans, summary };
}
