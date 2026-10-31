import "server-only";

// Thin Qloo client. Only entity IDs, tag IDs and coordinates are sent to
// Qloo, never names or support details. Hackathon keys work only on
// hackathon.api.qloo.com; production keys use api.qloo.com.

import type { Candidate, Explain, MediaPick, TagRef } from "./types";
import { distanceKm } from "./geo";

const BASE_URL = (process.env.QLOO_API_URL ?? "https://hackathon.api.qloo.com").replace(/\/$/, "");
const TIMEOUT_MS = 15_000;

export const qlooConfigured = () => Boolean(process.env.QLOO_API_KEY);

export class QlooError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | string[] | undefined>;
type Json = Record<string, unknown>;

/** Serialize params the way Qloo expects: comma-joined arrays, no empties. */
export function toQuery(params: Params): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return out;
}

async function get(path: string, params: Params): Promise<Json> {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new QlooError("QLOO_API_KEY is not set");
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(toQuery(params))) url.searchParams.set(k, v);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    }).catch((e: unknown) => {
      throw new QlooError(e instanceof Error ? e.message : "Network error");
    });
    if (res.ok) return (await res.json()) as Json;
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
      continue;
    }
    const body = await res.text().catch(() => "");
    throw new QlooError(`Qloo ${path} returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`, res.status);
  }
  throw new QlooError(`Qloo ${path} failed`);
}

const rec = (v: unknown): Json | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function resultList(body: Json, key: string): unknown[] {
  const results = body.results;
  if (Array.isArray(results)) return results;
  return arr(rec(results)?.[key]);
}

function tagsOf(entity: Json): TagRef[] {
  return arr(entity.tags)
    .map((t) => rec(t))
    .filter((t): t is Json => Boolean(t))
    .map((t) => ({
      id: str(t.id) ?? str(t.tag_id) ?? "",
      name: str(t.name) ?? "",
      type: str(t.type),
    }))
    .filter((t) => t.id && t.name);
}

/** Pull per-input contributions out of query.explainability, whatever its nesting. */
function explainOf(entity: Json, names: Record<string, string>): Explain[] {
  const out = new Map<string, number>();
  const walk = (v: unknown, depth: number) => {
    if (depth > 4) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    const r = rec(v);
    if (!r) return;
    const id = str(r.entity_id) ?? str(r.id) ?? str(r.tag_id);
    const score = num(r.score) ?? num(r.value) ?? num(r.weight);
    if (id && score !== undefined) out.set(id, Math.max(score, out.get(id) ?? 0));
    else Object.values(r).forEach((x) => walk(x, depth + 1));
  };
  walk(rec(entity.query)?.explainability, 0);
  return [...out.entries()]
    .map(([id, score]) => ({ id, score, name: names[id] ?? "" }))
    .filter((e) => e.name)
    .sort((a, b) => b.score - a.score);
}

function categoryOf(tags: TagRef[]): string | undefined {
  const genre = tags.find((t) => /genre:place|category:place/.test(t.type ?? t.id));
  return genre?.name;
}

export interface EntityHit {
  id: string;
  name: string;
  type: string;
  subtitle?: string;
  image?: string;
}

export async function searchEntities(query: string, types?: string): Promise<EntityHit[]> {
  const body = await get("/search", { query, types, take: 8 });
  return resultList(body, "entities")
    .map((e) => rec(e))
    .filter((e): e is Json => Boolean(e))
    .map((e) => {
      const props = rec(e.properties) ?? {};
      const type = arr(e.types).map(str).find((t) => t?.startsWith("urn:entity:")) ?? str(e.subtype) ?? str(e.type) ?? "";
      return {
        id: str(e.entity_id) ?? str(e.id) ?? "",
        name: str(e.name) ?? "",
        type,
        subtitle: str(props.short_description) ?? str(e.disambiguation) ?? str(props.address),
        image: str(rec(props.image)?.url) ?? str(e.url),
      };
    })
    .filter((e) => e.id && e.name);
}

export async function findTags(query: string, tagTypes?: string): Promise<TagRef[]> {
  const body = await get("/v2/tags", {
    "filter.query": query,
    "feature.semantic_search": true,
    "filter.tag.types": tagTypes,
    take: 10,
  });
  return resultList(body, "tags")
    .map((t) => rec(t))
    .filter((t): t is Json => Boolean(t))
    .map((t) => ({ id: str(t.id) ?? str(t.tag_id) ?? "", name: str(t.name) ?? "", type: str(t.type) ?? str(t.subtype) }))
    .filter((t) => t.id && t.name);
}

export interface PlaceQuery {
  lat: number;
  lon: number;
  radiusKm: number;
  weekday: string;
  priceMax?: number;
  signalEntities: string[];
  signalTags?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  excludeEntities?: string[];
  take?: number;
}

export function placeParams(q: PlaceQuery): Record<string, string> {
  return toQuery({
    "filter.type": "urn:entity:place",
    "filter.location": `POINT(${q.lon} ${q.lat})`,
    "filter.location.radius": Math.round(q.radiusKm * 1000),
    "filter.hours": q.weekday,
    "filter.price_level.max": q.priceMax,
    "signal.interests.entities": q.signalEntities,
    "signal.interests.tags": q.signalTags,
    "filter.tags": q.includeTags,
    "operator.filter.tags": q.includeTags?.length ? "union" : undefined,
    "filter.exclude.tags": q.excludeTags,
    "filter.exclude.entities": q.excludeEntities,
    "bias.quality": "high",
    "feature.explainability": true,
    take: q.take ?? 25,
  });
}

export async function findPlaces(
  q: PlaceQuery,
  names: Record<string, string>,
  foundBy: string,
  accessibilityTagIds: string[] = [],
): Promise<Candidate[]> {
  const body = await get("/v2/insights", placeParams(q));
  return resultList(body, "entities")
    .map((e) => rec(e))
    .filter((e): e is Json => Boolean(e))
    // Drop places Qloo marks as permanently closed.
    .filter((e) => e.is_closed !== true && rec(e.properties)?.is_closed !== true)
    .map((e): Candidate => {
      const props = rec(e.properties) ?? {};
      const loc = rec(e.location) ?? rec(props.geocode) ?? {};
      const lat = num(loc.lat) ?? num(loc.latitude) ?? num(e.lat);
      const lon = num(loc.lon) ?? num(loc.longitude) ?? num(e.lon);
      const tags = tagsOf(e);
      return {
        id: str(e.entity_id) ?? str(e.id) ?? "",
        name: str(e.name) ?? "",
        address: str(props.address) ?? str(e.address) ?? str(e.disambiguation),
        category: categoryOf(tags),
        tags,
        priceLevel: num(props.price_level) ?? num(e.price_level),
        rating: num(props.business_rating) ?? num(e.business_rating),
        lat,
        lon,
        distanceKm: lat !== undefined && lon !== undefined ? distanceKm(q.lat, q.lon, lat, lon) : undefined,
        image: str(rec(props.image)?.url) ?? str(e.url),
        affinity: num(rec(e.query)?.affinity) ?? num(e.affinity) ?? 0,
        popularity: num(e.popularity),
        explain: explainOf(e, names),
        foundBy,
        source: "qloo",
        accessibilityListed: tags.some(
          (t) => accessibilityTagIds.includes(t.id) || /wheelchair/i.test(t.name),
        ),
      };
    })
    .filter((c) => c.id && c.name);
}

export const MEDIA_TYPES = {
  movie: "urn:entity:movie",
  tv_show: "urn:entity:tv_show",
  artist: "urn:entity:artist",
  podcast: "urn:entity:podcast",
  book: "urn:entity:book",
} as const;

export type MediaType = keyof typeof MEDIA_TYPES;

export function mediaParams(type: MediaType, signalEntities: string[], signalTags: string[] = [], take = 8) {
  return toQuery({
    "filter.type": MEDIA_TYPES[type],
    "signal.interests.entities": signalEntities,
    "signal.interests.tags": signalTags,
    "feature.explainability": true,
    take,
  });
}

export async function findMedia(
  type: MediaType,
  signalEntities: string[],
  names: Record<string, string>,
  signalTags: string[] = [],
): Promise<MediaPick[]> {
  const body = await get("/v2/insights", mediaParams(type, signalEntities, signalTags));
  const exclude = new Set(signalEntities);
  return resultList(body, "entities")
    .map((e) => rec(e))
    .filter((e): e is Json => Boolean(e))
    .map((e): MediaPick => {
      const props = rec(e.properties) ?? {};
      return {
        id: str(e.entity_id) ?? str(e.id) ?? "",
        name: str(e.name) ?? "",
        type: MEDIA_TYPES[type],
        year: num(props.release_year),
        image: str(rec(props.image)?.url),
        affinity: num(rec(e.query)?.affinity) ?? num(e.affinity) ?? 0,
        explain: explainOf(e, names),
        source: "qloo",
      };
    })
    .filter((m) => m.id && m.name && !exclude.has(m.id));
}
