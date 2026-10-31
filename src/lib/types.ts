// Domain types shared by the client store, the API routes and the agent.

export type LoveKind = "entity" | "tag";

/** Something the person is known to love, resolved to a Qloo entity or tag. */
export interface Love {
  id: string;
  name: string;
  kind: LoveKind;
  /** Qloo type URN, e.g. urn:entity:artist or urn:tag:genre:place */
  type: string;
  /** Short human note, e.g. "Sings along to Bidi Bidi Bom Bom" */
  note?: string;
}

export type Mobility = "none" | "wheelchair" | "walker" | "cane";
export type Transport = "van" | "walk" | "bus";
export type StaffRatio = "1:1" | "1:2" | "1:3";

export interface SupportProfile {
  mobility: Mobility;
  communication: string;
  signsHappy: string;
  signsDistress: string;
  staffRatio: StaffRatio;
  dietary?: string;
  other?: string;
}

export interface HomeBase {
  label: string;
  lat: number;
  lon: number;
}

/** Hard rules that always apply, e.g. "loud" removes noisy places. */
export type AvoidRule = "loud" | "crowded" | "bars" | "late" | "water";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  pronouns: "she/her" | "he/him" | "they/them";
  age: number;
  hue: number;
  summary: string;
  home: HomeBase;
  loves: Love[];
  avoid: AvoidRule[];
  support: SupportProfile;
  defaults: { budget: number; radiusKm: number; transport: Transport };
  createdAt: string;
}

export interface TagRef {
  id: string;
  name: string;
  type?: string;
}

export type DataSource = "qloo" | "sample";

export interface PlaceSnapshot {
  id: string;
  name: string;
  address?: string;
  category?: string;
  tags: TagRef[];
  priceLevel?: number;
  lat?: number;
  lon?: number;
  source: DataSource;
}

export type Reaction = "lit_up" | "fine" | "not_for_them";

export type ReactionTag =
  | "too_loud"
  | "too_crowded"
  | "wanted_to_stay"
  | "left_early"
  | "tried_something_new"
  | "social_moment"
  | "ate_well"
  | "calm"
  | "tired";

export interface Outing {
  id: string;
  personId: string;
  status: "planned" | "logged";
  date: string;
  window?: string;
  place: PlaceSnapshot;
  planTitle: string;
  why?: string;
  supportNotes?: string[];
  staff: string;
  reaction?: Reaction;
  reactionTags?: ReactionTag[];
  note?: string;
  loggedAt?: string;
  /** Part of the labeled sample history, not a real observation. */
  sample?: boolean;
}

/** One input love's contribution to a Qloo result (feature.explainability). */
export interface Explain {
  id: string;
  name: string;
  score: number;
}

/** A place Qloo returned for a plan request, before ranking. */
export interface Candidate extends PlaceSnapshot {
  affinity: number;
  popularity?: number;
  rating?: number;
  distanceKm?: number;
  image?: string;
  explain: Explain[];
  /** Which search surfaced it, e.g. "Places like their loves" */
  foundBy: string;
  accessibilityListed: boolean;
}

export interface MediaPick {
  id: string;
  name: string;
  type: string;
  year?: number;
  image?: string;
  affinity: number;
  explain: Explain[];
  source: DataSource;
}

export type PlanKind = "regular" | "new" | "at_home";

export interface Plan {
  kind: PlanKind;
  candidateId: string;
  title: string;
  why: string;
  supportNotes: string[];
  timing: string;
  backup?: string;
}

export interface PlanConstraints {
  date: string;
  start: string;
  end: string;
  budget: number;
  radiusKm: number;
  transport: Transport;
  includeAtHome: boolean;
}

export type AgentStepStatus = "running" | "done" | "error";

export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  status: AgentStepStatus;
  /** Qloo request shown to staff for transparency */
  request?: { endpoint: string; params: Record<string, string> };
  resultCount?: number;
}

export interface RunMode {
  qloo: "live" | "sample";
  agent: "claude" | "rules";
}

export type PlanEvent =
  | { type: "mode"; mode: RunMode }
  | { type: "loves"; loves: Love[] }
  | { type: "step"; step: AgentStep }
  | { type: "candidates"; candidates: Candidate[] }
  | { type: "media"; media: MediaPick[] }
  | { type: "plans"; plans: Plan[]; summary: string }
  | { type: "notice"; message: string }
  | { type: "error"; message: string }
  | { type: "done" };
