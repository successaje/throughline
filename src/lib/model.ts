// Per-person preference model learned from logged reactions.
//
// Qloo proposes places by taste affinity; this model decides what stays.
// Each place is described by features (its Qloo tags plus a few sensory
// traits). Every logged outing updates a Beta posterior per feature. Ranking
// blends Qloo affinity with the learned posteriors, applies hard avoid rules,
// and uses Thompson sampling to pick one "new" option worth learning from.

import type {
  AvoidRule,
  Candidate,
  Outing,
  Person,
  PlaceSnapshot,
  Reaction,
  ReactionTag,
} from "./types";

export interface Posterior {
  a: number;
  b: number;
  /** Number of logged outings that touched this feature. */
  n: number;
}

export type FeatureMap = Record<string, Posterior>;

interface Trait {
  key: string;
  label: string;
  match: RegExp;
}

// Sensory and setting traits inferred from Qloo tag names and categories.
const TRAITS: Trait[] = [
  { key: "sense:loud", label: "Loud, lively places", match: /lively|loud|noisy|party|night ?club|nightlife|bar\b|pub|live music|dance hall|arcade|stadium|arena|bowling|festive|karaoke/i },
  { key: "sense:crowded", label: "Busy, crowded places", match: /crowd|busy|tourist|mall|stadium|arena|festival|amusement/i },
  { key: "sense:quiet", label: "Quiet, calm places", match: /quiet|relaxing|peaceful|calm|cozy|serene|tranquil|library|conservatory|botanical|reading/i },
  { key: "sense:outdoors", label: "Being outdoors", match: /park|garden|outdoor|farm|stable|trail|zoo|nature|preserve|botanical|patio|lake|river|orchard/i },
  { key: "sense:animals", label: "Animals", match: /zoo|farm|stable|horse|equestrian|aquarium|petting|animal|cat caf|dog|barn|sanctuary/i },
  { key: "sense:music", label: "Music", match: /music|concert|record|vinyl|jazz|tejano|choir|karaoke|dance/i },
  { key: "sense:food", label: "Eating out", match: /restaurant|taquer|cafe|café|bakery|diner|food|kitchen|grill|pizza|ice cream|tacos/i },
  { key: "sense:hands_on", label: "Hands-on activities", match: /craft|pottery|paint|workshop|class|studio|makers|garden center|cooking/i },
  { key: "sense:screen", label: "Films and screens", match: /cinema|theater|theatre|movie/i },
];

export const TRAIT_LABELS: Record<string, string> = Object.fromEntries(
  TRAITS.map((t) => [t.key, t.label]),
);

/** Reaction tags that tell us something about the place itself. */
const IMPLIED_TRAITS: Partial<Record<ReactionTag, string>> = {
  too_loud: "sense:loud",
  too_crowded: "sense:crowded",
  calm: "sense:quiet",
};

const AVOID_TRAITS: Record<AvoidRule, string[]> = {
  loud: ["sense:loud"],
  crowded: ["sense:crowded"],
  bars: ["sense:loud"],
  late: [],
  water: [],
};

export const AVOID_LABELS: Record<AvoidRule, string> = {
  loud: "Loud places",
  crowded: "Crowds",
  bars: "Bars and nightlife",
  late: "Late finishes",
  water: "Open water",
};

export const REACTION_REWARD: Record<Reaction, number> = {
  lit_up: 1,
  fine: 0.55,
  not_for_them: 0,
};

const placeKey = (id: string) => `place:${id}`;
const tagKey = (id: string) => `tag:${id}`;

/** Sensory traits inferred from a place's name, category and tags. */
export function traitsOf(place: Pick<PlaceSnapshot, "name" | "category" | "tags">): string[] {
  const text = [place.name, place.category, ...place.tags.map((t) => t.name)].join(" | ");
  return TRAITS.filter((t) => t.match.test(text)).map((t) => t.key);
}

/** All features describing a place: identity, Qloo tags, inferred traits. */
export function featuresOf(place: PlaceSnapshot, extraTraits: string[] = []): string[] {
  const tagFeatures = place.tags
    // Access and logistics tags describe the venue, not what the person enjoys.
    .filter((t) => !/accessibility|payments|parking|service_options|dining_options:place/.test(t.type ?? t.id))
    .map((t) => tagKey(t.id));
  return [...new Set([placeKey(place.id), ...tagFeatures, ...traitsOf(place), ...extraTraits])];
}

function rewardFor(outing: Outing): number {
  let r = REACTION_REWARD[outing.reaction ?? "fine"];
  const tags = outing.reactionTags ?? [];
  if (tags.includes("wanted_to_stay")) r = Math.min(1, r + 0.15);
  if (tags.includes("left_early")) r = Math.max(0, r - 0.25);
  return r;
}

function weightFor(feature: string): number {
  if (feature.startsWith("place:")) return 1.5;
  if (feature.startsWith("sense:")) return 1;
  return 0.5;
}

/** Tag ID → display name, from places already seen. */
export function tagNameIndex(...places: { tags: { id: string; name: string }[] }[][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const list of places) for (const p of list) for (const t of p.tags) out[t.id] = t.name;
  return out;
}

/** Fold every logged outing into per-feature Beta posteriors. */
export function learn(outings: Outing[]): FeatureMap {
  const map: FeatureMap = {};
  const bump = (f: string, success: number, failure: number, counts = true) => {
    const p = (map[f] ??= { a: 1, b: 1, n: 0 });
    p.a += success;
    p.b += failure;
    if (counts) p.n += 1;
  };

  for (const o of outings) {
    if (o.status !== "logged" || !o.reaction) continue;
    const r = rewardFor(o);
    const implied = (o.reactionTags ?? [])
      .map((t) => IMPLIED_TRAITS[t])
      .filter((t): t is string => Boolean(t));
    for (const f of featuresOf(o.place, implied)) {
      const w = weightFor(f);
      bump(f, w * r, w * (1 - r));
    }
    // A specific sensory complaint is strong evidence against that trait,
    // even when the outing was otherwise fine.
    if (o.reactionTags?.includes("too_loud")) bump("sense:loud", 0, 1.5, false);
    if (o.reactionTags?.includes("too_crowded")) bump("sense:crowded", 0, 1.5, false);
    if (o.reactionTags?.includes("calm")) bump("sense:quiet", 1, 0, false);
  }
  return map;
}

export const mean = (p: Posterior) => p.a / (p.a + p.b);
export const evidence = (p: Posterior) => p.a + p.b - 2;

export interface Learned {
  key: string;
  label: string;
  mean: number;
  evidence: number;
}

/** Human-readable traits the person reliably likes or dislikes. */
export function insights(map: FeatureMap, tagNames: Record<string, string> = {}): {
  likes: Learned[];
  dislikes: Learned[];
} {
  const rows: Learned[] = Object.entries(map)
    .filter(([k]) => !k.startsWith("place:"))
    .map(([key, p]) => ({
      key,
      label: TRAIT_LABELS[key] ?? tagNames[key.replace(/^tag:/, "")] ?? key,
      mean: mean(p),
      evidence: p.n,
    }))
    .filter((r) => r.evidence >= 2);

  const likes = rows
    .filter((r) => r.mean >= 0.62)
    .sort((x, y) => y.mean * Math.log1p(y.evidence) - x.mean * Math.log1p(x.evidence));
  const dislikes = rows
    .filter((r) => r.mean <= 0.4)
    .sort((x, y) => x.mean / Math.log1p(x.evidence) - y.mean / Math.log1p(y.evidence));
  const dedupe = (list: Learned[]) => {
    const seen = new Set<string>();
    return list.filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)));
  };
  return { likes: dedupe(likes).slice(0, 8), dislikes: dedupe(dislikes).slice(0, 6) };
}

export interface PlaceHistory {
  visits: number;
  litUp: number;
  notForThem: number;
  last?: Outing;
}

export function historyByPlace(outings: Outing[]): Record<string, PlaceHistory> {
  const out: Record<string, PlaceHistory> = {};
  for (const o of outings) {
    if (o.status !== "logged") continue;
    const h = (out[o.place.id] ??= { visits: 0, litUp: 0, notForThem: 0 });
    h.visits += 1;
    if (o.reaction === "lit_up") h.litUp += 1;
    if (o.reaction === "not_for_them") h.notForThem += 1;
    if (!h.last || o.date > h.last.date) h.last = o;
  }
  return out;
}

export interface Reason {
  label: string;
  direction: "up" | "down";
  evidence: number;
}

export interface Scored {
  candidate: Candidate;
  score: number;
  qloo: number;
  learned: number;
  reasons: Reason[];
  history?: PlaceHistory;
  blocked?: string;
  flagged?: string;
}

/** Deterministic PRNG so a given plan request ranks reproducibly. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

// Marsaglia-Tsang gamma sampler, used to draw Beta samples.
function gamma(k: number, rand: () => number): number {
  if (k < 1) return gamma(k + 1, rand) * Math.pow(rand() || 1e-9, 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      const u1 = rand() || 1e-9;
      const u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand() || 1e-9;
    if (Math.log(u) < 0.5 * x * x + d - d * v + Math.log(v)) return d * v;
  }
}

export function sampleBeta(p: Posterior, rand: () => number): number {
  const x = gamma(p.a, rand);
  const y = gamma(p.b, rand);
  return x / (x + y);
}

/**
 * Rank candidates for one person. Qloo affinity supplies the taste prior;
 * learned posteriors adjust it; hard rules block or flag.
 */
export function rank(
  candidates: Candidate[],
  person: Pick<Person, "avoid">,
  outings: Outing[],
  tagNames: Record<string, string> = {},
): Scored[] {
  const map = learn(outings);
  const hist = historyByPlace(outings);
  tagNames = { ...tagNameIndex(candidates, outings.map((o) => o.place)), ...tagNames };
  const affinities = candidates.map((c) => c.affinity);
  const lo = Math.min(...affinities);
  const hi = Math.max(...affinities);
  const avoidTraits = new Set(person.avoid.flatMap((a) => AVOID_TRAITS[a]));

  const scored = candidates.map((c): Scored => {
    const feats = featuresOf(c);
    const qloo = hi > lo ? (c.affinity - lo) / (hi - lo) : 0.5;

    let num = 0;
    let den = 0;
    const reasons: Reason[] = [];
    for (const f of feats) {
      const p = map[f];
      if (!p || evidence(p) <= 0) continue;
      const n = evidence(p);
      const conf = n / (n + 2);
      const w = weightFor(f) * conf;
      num += w * (mean(p) - 0.5);
      den += weightFor(f);
      if (!f.startsWith("place:") && Math.abs(mean(p) - 0.5) >= 0.12 && n >= 1.5) {
        reasons.push({
          label: TRAIT_LABELS[f] ?? tagNames[f.replace(/^tag:/, "")] ?? f,
          direction: mean(p) > 0.5 ? "up" : "down",
          evidence: p.n,
        });
      }
    }
    const learned = den > 0 ? Math.max(-0.5, Math.min(0.5, (num / den) * 2)) : 0;

    const h = hist[c.id];
    let score = 0.55 * qloo + 0.45 * (0.5 + learned);
    if (h?.litUp) score += Math.min(0.2, 0.1 * h.litUp);

    let blocked: string | undefined;
    if (h?.notForThem && h.notForThem >= h.litUp) blocked = "Logged as not for them";
    const traits = traitsOf(c);
    const hit = traits.find((t) => avoidTraits.has(t));
    let flagged: string | undefined;
    if (hit) {
      score -= 0.35;
      flagged = `${TRAIT_LABELS[hit]} — on their avoid list`;
    }

    const seen = new Set<string>();
    const uniqueReasons = reasons
      .sort((x, y) => y.evidence - x.evidence)
      .filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)))
      .slice(0, 3);

    return { candidate: c, score, qloo, learned, reasons: uniqueReasons, history: h, blocked, flagged };
  });

  return scored.sort((x, y) => {
    if (Boolean(x.blocked) !== Boolean(y.blocked)) return x.blocked ? 1 : -1;
    return y.score - x.score;
  });
}

/**
 * Thompson sampling over unvisited, unblocked candidates: draw from each
 * feature posterior, so uncertain-but-promising places get tried.
 */
export function explorePick(ranked: Scored[], outings: Outing[], seed: number): Scored | undefined {
  const map = learn(outings);
  const rand = seeded(seed);
  const pool = ranked.filter((s) => !s.blocked && !s.flagged && !s.history);
  let best: Scored | undefined;
  let bestDraw = -Infinity;
  for (const s of pool) {
    const feats = featuresOf(s.candidate).filter((f) => !f.startsWith("place:"));
    const draws = feats.map((f) => sampleBeta(map[f] ?? { a: 1, b: 1, n: 0 }, rand));
    const taste = draws.length ? draws.reduce((x, y) => x + y, 0) / draws.length : 0.5;
    const draw = 0.5 * s.qloo + 0.5 * taste;
    if (draw > bestDraw) {
      bestDraw = draw;
      best = s;
    }
  }
  return best;
}

/** Compare two rankings and report how each candidate moved. */
export function movement(before: string[], after: string[]): Record<string, number> {
  const pos = Object.fromEntries(before.map((id, i) => [id, i]));
  return Object.fromEntries(after.map((id, i) => [id, id in pos ? pos[id] - i : 0]));
}

/** Plain-language summary of what a single reaction taught the model. */
export function lessonOf(outing: Outing): string[] {
  const lessons: string[] = [];
  const traits = traitsOf(outing.place).map((t) => TRAIT_LABELS[t]);
  const tags = outing.reactionTags ?? [];
  if (tags.includes("too_loud")) lessons.push("Loud places ranked lower");
  if (tags.includes("too_crowded")) lessons.push("Busy places ranked lower");
  if (tags.includes("calm")) lessons.push("Quiet places ranked higher");
  if (outing.reaction === "lit_up") {
    lessons.push(`${outing.place.name} becomes a regular`);
    if (traits[0]) lessons.push(`${traits.slice(0, 2).join(" and ")} ranked higher`);
  }
  if (outing.reaction === "not_for_them") lessons.push(`${outing.place.name} won't be suggested again`);
  return [...new Set(lessons)].slice(0, 3);
}
