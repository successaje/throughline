import "server-only";

// One interface over live Qloo and the labeled sample dataset, so the agent,
// the rules planner and the UI behave the same either way.

import * as qloo from "../qloo";
import type { MediaType, PlaceQuery } from "../qloo";
import type { Candidate, Explain, Love, MediaPick, TagRef } from "../types";
import { distanceKm } from "../geo";
import { SAMPLE_MEDIA, SAMPLE_PLACES, snapshot } from "../sample/places";

export interface Provider {
  mode: "live" | "sample";
  resolveLove(love: Love): Promise<Love | null>;
  findTags(query: string, tagType?: string): Promise<TagRef[]>;
  accessibilityTags(): Promise<TagRef[]>;
  /** `names` maps the current love IDs to names, for explainability labels. */
  findPlaces(q: PlaceQuery, foundBy: string, accessibilityIds: string[], names: Record<string, string>): Promise<Candidate[]>;
  findMedia(type: MediaType, signals: string[], signalTags: string[], names: Record<string, string>): Promise<MediaPick[]>;
}

export const isUnresolved = (love: Love) => love.id.startsWith("seed:") || love.id.startsWith("local:");

export function liveProvider(): Provider {
  let access: TagRef[] | undefined;
  return {
    mode: "live",
    async resolveLove(love) {
      if (!isUnresolved(love)) return love;
      if (love.kind === "entity") {
        const hits = await qloo.searchEntities(love.name.replace(/\s*\(\d{4}\)$/, ""), love.type || undefined);
        const hit = hits[0];
        return hit ? { ...love, id: hit.id, type: hit.type || love.type } : null;
      }
      const tags = await qloo.findTags(love.name);
      const tag = tags[0];
      return tag ? { ...love, id: tag.id, type: tag.type ?? love.type } : null;
    },
    findTags: (query, tagType) => qloo.findTags(query, tagType),
    async accessibilityTags() {
      access ??= (await qloo.findTags("wheelchair accessible entrance", "urn:tag:accessibility:place")).filter((t) =>
        /wheelchair/i.test(t.name),
      );
      return access;
    },
    findPlaces: (q, foundBy, ids, names) => qloo.findPlaces(q, names, foundBy, ids),
    findMedia: (type, signals, signalTags, names) => qloo.findMedia(type, signals, names, signalTags),
  };
}

const SYNONYMS: Record<string, string[]> = {
  cavaliers: ["basketball", "sports"],
  "black panther": ["marvel", "movie"],
  "star wars": ["movie"],
  "golden girls": ["golden girls"],
  gardening: ["garden"],
  "gospel music": ["gospel", "music"],
  "hip-hop": ["hip hop", "music"],
  "dolly parton": ["dolly", "music"],
  selena: ["selena", "latin", "music"],
};

function keysOf(love: Love): string[] {
  const n = love.name.toLowerCase().replace(/\s*\(\d{4}\)$/, "");
  const extra = Object.entries(SYNONYMS).flatMap(([k, v]) => (n.includes(k) ? v : []));
  const singular = n.replace(/(es|s)$/, "");
  return [...new Set([n, singular, ...extra])];
}

/** Simulates Qloo with the fictional dataset. Affinity is keyword overlap. */
export function sampleProvider(loves: Love[]): Provider {
  const byId = Object.fromEntries(loves.map((l) => [l.id, l]));
  const explainFor = (keys: string[], signals: string[]): Explain[] =>
    signals
      .map((id) => byId[id])
      .filter(Boolean)
      .map((l) => {
        const hits = keysOf(l).filter((k) => keys.some((x) => x.includes(k) || k.includes(x))).length;
        return { id: l.id, name: l.name, score: Math.min(1, hits * 0.45) };
      })
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score);

  return {
    mode: "sample",
    resolveLove: async (love) => love,
    async findTags(query) {
      const q = query.toLowerCase();
      const all = SAMPLE_PLACES.flatMap((p) => p.tags);
      const seen = new Set<string>();
      return all.filter((t) => t.name.toLowerCase().includes(q) && !seen.has(t.id) && seen.add(t.id)).slice(0, 8);
    },
    accessibilityTags: async () =>
      SAMPLE_PLACES.flatMap((p) => p.tags).filter((t) => /wheelchair/i.test(t.name)).slice(0, 1),
    async findPlaces(q, foundBy, accessibilityIds) {
      const signals = [...q.signalEntities, ...(q.signalTags ?? [])];
      return SAMPLE_PLACES.filter((p) => {
        const d = distanceKm(q.lat, q.lon, p.lat!, p.lon!);
        if (d > q.radiusKm) return false;
        if (q.priceMax && p.priceLevel && p.priceLevel > q.priceMax) return false;
        if (q.excludeEntities?.includes(p.id)) return false;
        if (q.includeTags?.length && !p.tags.some((t) => q.includeTags!.includes(t.id))) return false;
        if (q.excludeTags?.length && p.tags.some((t) => q.excludeTags!.includes(t.id))) return false;
        return true;
      })
        .map((p): Candidate => {
          const explain = explainFor(p.affinityKeys, signals);
          const overlap = explain.reduce((s, e) => s + e.score, 0);
          return {
            ...snapshot(p),
            rating: p.rating,
            affinity: Math.min(0.97, 0.5 + 0.18 * overlap + (p.rating - 4) * 0.08),
            distanceKm: distanceKm(q.lat, q.lon, p.lat!, p.lon!),
            explain,
            foundBy,
            accessibilityListed: p.tags.some((t) => accessibilityIds.includes(t.id)),
          };
        })
        .sort((a, b) => b.affinity - a.affinity)
        .slice(0, q.take ?? 25);
    },
    async findMedia(type, signals) {
      const target = qloo.MEDIA_TYPES[type];
      return SAMPLE_MEDIA.filter((m) => type === "movie" || type === "tv_show" ? m.type === target || type === "movie" : false)
        .map((m): MediaPick => {
          const explain = explainFor(m.keys, signals);
          return {
            id: m.id,
            name: m.name,
            type: m.type,
            year: m.year,
            affinity: Math.min(0.96, 0.4 + 0.25 * explain.reduce((s, e) => s + e.score, 0)),
            explain,
            source: "sample",
          };
        })
        .filter((m) => m.explain.length > 0 && !loves.some((l) => l.name.toLowerCase().startsWith(m.name.toLowerCase())))
        .sort((a, b) => b.affinity - a.affinity)
        .slice(0, 6);
    },
  };
}

export function providerFor(loves: Love[]): Provider {
  return qloo.qlooConfigured() ? liveProvider() : sampleProvider(loves);
}
