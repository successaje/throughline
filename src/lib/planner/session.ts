import "server-only";

// State for one planning run: resolves loves, runs Qloo searches with the
// person's hard constraints, keeps every candidate, and reports each step to
// the UI so staff can see exactly what was asked of Qloo.

import { mediaParams, placeParams, type MediaType, type PlaceQuery } from "../qloo";
import type {
  AgentStep,
  Candidate,
  Love,
  MediaPick,
  Outing,
  Person,
  PlanConstraints,
  PlanEvent,
  TagRef,
} from "../types";
import { priceCeiling, weekdayOf } from "../geo";
import { formatWindow } from "../format";
import { insights, learn, rank, tagNameIndex, type Scored } from "../model";
import { isUnresolved, type Provider } from "./provider";

export interface PlanRequest {
  person: Person;
  outings: Outing[];
  constraints: PlanConstraints;
  tagNames: Record<string, string>;
  seed: number;
}

export type Emit = (e: PlanEvent) => void;

const MIN_ACCESSIBLE = 5;

export class Session {
  readonly candidates = new Map<string, Candidate>();
  readonly media = new Map<string, MediaPick>();
  loves: Love[];
  private stepCount = 0;
  private accessibility?: TagRef[];

  constructor(
    readonly req: PlanRequest,
    readonly provider: Provider,
    readonly emit: Emit,
  ) {
    this.loves = req.person.loves;
  }

  get person() {
    return this.req.person;
  }

  step(label: string, detail?: string, request?: AgentStep["request"]) {
    const step: AgentStep = { id: `s${++this.stepCount}`, label, detail, status: "running", request };
    this.emit({ type: "step", step });
    return {
      done: (resultCount?: number, newDetail?: string) =>
        this.emit({ type: "step", step: { ...step, status: "done", resultCount, detail: newDetail ?? detail } }),
      fail: (message: string) => this.emit({ type: "step", step: { ...step, status: "error", detail: message } }),
    };
  }

  /** Match each love to a Qloo entity or tag ID (once; IDs are saved back). */
  async resolveLoves() {
    const pending = this.loves.filter(isUnresolved);
    if (!pending.length || this.provider.mode === "sample") return;
    const s = this.step("Matching their loves to Qloo", pending.map((l) => l.name).join(", "), {
      endpoint: "GET /search · /v2/tags",
      params: { query: pending.map((l) => l.name).join(" | ") },
    });
    const resolved = await Promise.all(
      this.loves.map(async (l) => (isUnresolved(l) ? ((await this.provider.resolveLove(l).catch(() => null)) ?? l) : l)),
    );
    const matched = resolved.filter((l, i) => l.id !== this.loves[i].id).length;
    this.loves = resolved;
    this.emit({ type: "loves", loves: resolved });
    s.done(matched, `${matched} of ${pending.length} matched`);
  }

  private names() {
    return Object.fromEntries(this.loves.map((l) => [l.id, l.name]));
  }

  loveById(id: string) {
    return this.loves.find((l) => l.id === id);
  }

  private splitSignals(ids: string[]) {
    const entities: string[] = [];
    const tags: string[] = [];
    for (const id of ids) {
      const love = this.loveById(id);
      if (love && isUnresolved(love) && this.provider.mode === "live") continue;
      const isTag = love ? love.kind === "tag" : id.startsWith("urn:tag");
      (isTag ? tags : entities).push(id);
    }
    // Two loves can resolve to the same Qloo ID; send each signal once.
    return { entities: [...new Set(entities)], tags: [...new Set(tags)] };
  }

  baseQuery(): Omit<PlaceQuery, "signalEntities"> {
    const { person, constraints, outings } = this.req;
    const excluded = outings
      .filter((o) => o.status === "logged" && o.reaction === "not_for_them")
      .filter((o) => o.place.source === (this.provider.mode === "live" ? "qloo" : "sample"))
      .map((o) => o.place.id);
    return {
      lat: person.home.lat,
      lon: person.home.lon,
      radiusKm: constraints.radiusKm,
      weekday: weekdayOf(constraints.date),
      priceMax: priceCeiling(constraints.budget),
      excludeEntities: [...new Set(excluded)],
      take: 25,
    };
  }

  /**
   * Search Qloo places. Loves are signals; preferred tags are soft signals;
   * excluded tags are hard filters. Location, opening day, price ceiling and
   * past "not for them" places are always enforced here, never left to the agent.
   */
  async searchPlaces(lookingFor: string, signalIds: string[], preferTags: string[] = [], excludeTags: string[] = []) {
    const { entities, tags } = this.splitSignals(signalIds.length ? signalIds : this.loves.map((l) => l.id));
    const base: PlaceQuery = {
      ...this.baseQuery(),
      signalEntities: entities,
      signalTags: [...tags, ...preferTags],
      excludeTags,
    };
    if (!base.signalEntities.length && !base.signalTags?.length) {
      throw new Error("No Qloo-matched loves to search with yet");
    }

    const needsAccess = this.person.support.mobility === "wheelchair";
    if (needsAccess) this.accessibility ??= await this.provider.accessibilityTags().catch(() => []);
    const accessIds = (this.accessibility ?? []).map((t) => t.id);
    const query: PlaceQuery = needsAccess && accessIds.length ? { ...base, includeTags: accessIds } : base;

    const s = this.step(lookingFor, describe(query, this.req.constraints), {
      endpoint: "GET /v2/insights",
      params: placeParams(query),
    });
    try {
      let found = await this.provider.findPlaces(query, lookingFor, accessIds, this.names());
      if (query.includeTags?.length && found.length < MIN_ACCESSIBLE) {
        // Too few places list step-free access: widen, and flag the rest "call ahead".
        const more = await this.provider.findPlaces(base, lookingFor, accessIds, this.names());
        const ids = new Set(found.map((c) => c.id));
        found = [...found, ...more.filter((c) => !ids.has(c.id))];
        this.emit({
          type: "notice",
          message: "Few places list a wheelchair-accessible entrance in Qloo, so some results need a call ahead.",
        });
      }
      for (const c of found) if (!this.candidates.has(c.id)) this.candidates.set(c.id, c);
      this.emit({ type: "candidates", candidates: [...this.candidates.values()] });
      s.done(found.length, `${found.length} open ${capital(base.weekday)} within ${Math.round(base.radiusKm * 0.621)} mi`);
      return found;
    } catch (e) {
      s.fail(e instanceof Error ? e.message : "Qloo request failed");
      throw e;
    }
  }

  async searchMedia(type: MediaType, signalIds: string[]) {
    const { entities, tags } = this.splitSignals(signalIds.length ? signalIds : this.loves.map((l) => l.id));
    const s = this.step(`At-home ideas: ${MEDIA_LABEL[type]}`, "Cross-domain picks from their loves", {
      endpoint: "GET /v2/insights",
      params: mediaParams(type, entities, tags),
    });
    try {
      const loveNames = new Set(this.loves.map((l) => l.name.toLowerCase().replace(/\s*\(\d{4}\)$/, "")));
      // Skip picks that are just one of their loves again.
      const found = (await this.provider.findMedia(type, entities, tags, this.names())).filter((m) => !loveNames.has(m.name.toLowerCase()));
      for (const m of found) this.media.set(m.id, m);
      this.emit({ type: "media", media: [...this.media.values()] });
      s.done(found.length);
      return found;
    } catch (e) {
      s.fail(e instanceof Error ? e.message : "Qloo request failed");
      throw e;
    }
  }

  ranked(): Scored[] {
    return rank([...this.candidates.values()], this.person, this.req.outings, this.req.tagNames);
  }

  learned() {
    return insights(learn(this.req.outings), { ...tagNameIndex(this.req.outings.map((o) => o.place)), ...this.req.tagNames });
  }
}

const MEDIA_LABEL: Record<MediaType, string> = {
  movie: "films",
  tv_show: "TV",
  artist: "music",
  podcast: "podcasts",
  book: "books",
};

const capital = (s: string) => s[0].toUpperCase() + s.slice(1) + "s";

function describe(q: PlaceQuery, c: PlanConstraints) {
  const parts = [`Open ${capital(q.weekday)}`, `within ${Math.round(q.radiusKm * 0.621)} mi`, `up to ${"$".repeat(q.priceMax ?? 4)}`];
  if (q.includeTags?.length) parts.push("step-free entrance");
  if (q.excludeEntities?.length) parts.push(`${q.excludeEntities.length} places excluded`);
  return `${parts.join(" · ")} · ${formatWindow(c.start, c.end)}`;
}
