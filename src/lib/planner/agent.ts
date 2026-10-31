import "server-only";

// Claude plans the shift; Qloo supplies every place. The agent sees the
// person's profile without their name, calls Qloo through tools whose hard
// limits (area, day, price, past "not for them" places) are enforced here,
// and submits two or three plans that must reference real candidates.

import Anthropic from "@anthropic-ai/sdk";
import type { MediaType } from "../qloo";
import { formatWindow, pronoun } from "../format";
import { weekdayOf } from "../geo";
import { AVOID_LABELS, historyByPlace } from "../model";
import type { Plan, PlanKind } from "../types";
import type { Session } from "./session";

export const agentConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? "medium") as "low" | "medium" | "high";
export const MAX_TURNS = 8;

export const SYSTEM = `You plan community outings for an adult with an intellectual or developmental disability, working for their direct support professional (DSP). The DSP is often new and has never met the person. Your job: turn what the person is known to love, and what their logged outings show, into two or three concrete options for one shift.

How to work:
- Use search_places to get real places from Qloo. The area, opening day, price ceiling and places already marked "not for them" are enforced for you. Run one to three searches: usually one with all their loves, plus one focused search if a love deserves its own (for example a single strong interest).
- Use find_tags only when you need a Qloo tag ID to prefer or exclude something specific.
- If the request includes at-home ideas, use search_at_home once.
- Then call submit_plans exactly once and stop.

What good plans look like:
- One "regular": a place they already lit up at, or the strongest proven fit. One "new": a place they haven't been that shares what has worked. One "at_home" only if asked.
- Respect learned dislikes and the avoid list. A candidate with a flag should not be chosen unless nothing else fits, and then say why.
- "why" cites evidence in one or two short sentences: what they lit up at before, and which loves Qloo connected. No hype.
- support_notes are two or three practical lines drawn only from the profile and logs: how to communicate, signs of distress and what to do, access or diet. Never invent medical advice.
- Write plainly for a busy DSP reading on a phone. Refer to the person with their pronouns, never a name.
- Only use candidate_id values returned by your tool calls.`;

const KIND = ["regular", "new", "at_home"] as const satisfies readonly PlanKind[];

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_places",
    description:
      "Search Qloo for real places near the person that are open on the outing day and within budget, ranked by taste affinity to the given signals, then re-scored by the person's own logged reactions. Returns candidates with Qloo affinity, which loves drove each one (explainability), history and flags.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        looking_for: { type: "string", description: "Short label shown to the DSP, e.g. 'Places like their love of horses'" },
        signal_love_ids: { type: "array", items: { type: "string" }, description: "IDs of the person's loves to use as taste signals. Empty means all loves." },
        prefer_tag_ids: { type: "array", items: { type: "string" }, description: "Qloo tag IDs to boost (soft), from find_tags." },
        exclude_tag_ids: { type: "array", items: { type: "string" }, description: "Qloo tag IDs to remove (hard), from find_tags." },
      },
      required: ["looking_for", "signal_love_ids", "prefer_tag_ids", "exclude_tag_ids"],
      additionalProperties: false,
    },
  },
  {
    name: "find_tags",
    description: "Look up Qloo tag IDs by meaning, e.g. 'quiet', 'live music', 'outdoor seating'.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        tag_type: {
          type: "string",
          enum: ["any", "urn:tag:genre:place", "urn:tag:ambience:qloo", "urn:tag:amenity:place", "urn:tag:accessibility:place", "urn:tag:cuisine:qloo"],
        },
      },
      required: ["query", "tag_type"],
      additionalProperties: false,
    },
  },
  {
    name: "search_at_home",
    description: "Cross-domain Qloo recommendations for a low-energy day at home (films, TV, music), from the person's loves.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        media_type: { type: "string", enum: ["movie", "tv_show", "artist"] },
        signal_love_ids: { type: "array", items: { type: "string" } },
      },
      required: ["media_type", "signal_love_ids"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_plans",
    description: "Submit the final two or three plans for this shift. Call once.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One sentence for the DSP." },
        plans: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [...KIND] },
              candidate_id: { type: "string" },
              title: { type: "string", description: "Short, e.g. 'Back to Silver Mane Stables'" },
              why: { type: "string" },
              support_notes: { type: "array", items: { type: "string" } },
              timing: { type: "string", description: "When to go and roughly how long, within the shift window." },
              backup: { type: "string", description: "What to do if it isn't working, or empty." },
            },
            required: ["kind", "candidate_id", "title", "why", "support_notes", "timing", "backup"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "plans"],
      additionalProperties: false,
    },
  },
];

/** The person's profile as the agent sees it: no name, no free-text identifiers. */
function brief(s: Session) {
  const { person, outings, constraints } = s.req;
  const scrub = (t?: string) =>
    t ? t.replaceAll(person.firstName, "the person").replaceAll(person.lastName, "") : t;
  const hist = historyByPlace(outings);
  const learned = s.learned();
  const recent = outings
    .filter((o) => o.status === "logged")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)
    .map((o) => ({ date: o.date, place: o.place.name, reaction: o.reaction, tags: o.reactionTags, note: scrub(o.note) }));
  return {
    pronouns: person.pronouns,
    age: person.age,
    about: scrub(person.summary),
    loves: s.loves.map((l) => ({ id: l.id, name: l.name, kind: l.kind, note: scrub(l.note) })),
    avoid_list: person.avoid.map((a) => AVOID_LABELS[a]),
    support: { ...person.support, communication: scrub(person.support.communication), signsHappy: scrub(person.support.signsHappy), signsDistress: scrub(person.support.signsDistress) },
    learned_from_logs: {
      likes: learned.likes.map((l) => `${l.label} (${l.mean.toFixed(2)}, ${Math.round(l.evidence)} outings)`),
      dislikes: learned.dislikes.map((l) => `${l.label} (${l.mean.toFixed(2)}, ${Math.round(l.evidence)} outings)`),
    },
    places_visited: Object.values(hist).map((h) => ({ place: h.last?.place.name, visits: h.visits, lit_up: h.litUp, not_for_them: h.notForThem })),
    recent_outings: recent,
    shift: {
      day: weekdayOf(constraints.date),
      date: constraints.date,
      window: formatWindow(constraints.start, constraints.end),
      budget_usd: constraints.budget,
      max_distance_miles: Math.round(constraints.radiusKm * 0.621),
      transport: constraints.transport,
      staff_ratio: person.support.staffRatio,
      include_at_home_idea: constraints.includeAtHome,
    },
  };
}

function compactCandidates(s: Session, ids: Set<string>) {
  return s
    .ranked()
    .filter((r) => ids.has(r.candidate.id))
    .slice(0, 14)
    .map((r) => ({
      candidate_id: r.candidate.id,
      name: r.candidate.name,
      category: r.candidate.category,
      distance_miles: r.candidate.distanceKm ? +(r.candidate.distanceKm * 0.621).toFixed(1) : null,
      price_level: r.candidate.priceLevel ?? null,
      rating: r.candidate.rating ?? null,
      qloo_affinity: +r.candidate.affinity.toFixed(3),
      driven_by: r.candidate.explain.slice(0, 3).map((e) => `${e.name} (${e.score.toFixed(2)})`),
      tags: r.candidate.tags.slice(0, 6).map((t) => t.name),
      fit_score: +r.score.toFixed(3),
      learned: r.reasons.map((x) => `${x.direction === "up" ? "+" : "-"} ${x.label} (${x.evidence} outings)`),
      history: r.history ? { visits: r.history.visits, lit_up: r.history.litUp, not_for_them: r.history.notForThem } : null,
      step_free_entrance_listed: r.candidate.accessibilityListed,
      flag: r.blocked ?? r.flagged ?? null,
    }));
}

export type ToolInput = Record<string, unknown>;

export async function runTool(s: Session, name: string, input: ToolInput, submit: (p: { summary: string; plans: Plan[] }) => void): Promise<string> {
  switch (name) {
    case "search_places": {
      const found = await s.searchPlaces(
        String(input.looking_for || "Places that fit their loves"),
        (input.signal_love_ids as string[]) ?? [],
        (input.prefer_tag_ids as string[]) ?? [],
        (input.exclude_tag_ids as string[]) ?? [],
      );
      if (!found.length) return JSON.stringify({ candidates: [], note: "No places matched. Try fewer signals or a different love." });
      return JSON.stringify({ candidates: compactCandidates(s, new Set(found.map((c) => c.id))) });
    }
    case "find_tags": {
      const type = input.tag_type === "any" ? undefined : String(input.tag_type);
      const step = s.step(`Looking up Qloo tags for "${input.query}"`, undefined, {
        endpoint: "GET /v2/tags",
        params: { "filter.query": String(input.query), ...(type ? { "filter.tag.types": type } : {}) },
      });
      const tags = await s.provider.findTags(String(input.query), type);
      step.done(tags.length);
      return JSON.stringify({ tags });
    }
    case "search_at_home": {
      const media = await s.searchMedia(input.media_type as MediaType, (input.signal_love_ids as string[]) ?? []);
      return JSON.stringify({
        options: media.slice(0, 6).map((m) => ({ candidate_id: m.id, name: m.name, year: m.year, qloo_affinity: +m.affinity.toFixed(3), driven_by: m.explain.map((e) => e.name) })),
      });
    }
    case "submit_plans": {
      const raw = (input.plans as Array<Record<string, unknown>>) ?? [];
      const valid = raw
        .filter((p) => s.candidates.has(String(p.candidate_id)) || s.media.has(String(p.candidate_id)))
        .map(
          (p): Plan => ({
            kind: KIND.includes(p.kind as PlanKind) ? (p.kind as PlanKind) : "new",
            candidateId: String(p.candidate_id),
            title: String(p.title),
            why: String(p.why),
            supportNotes: ((p.support_notes as string[]) ?? []).slice(0, 4),
            timing: String(p.timing),
            backup: p.backup ? String(p.backup) : undefined,
          }),
        );
      if (!valid.length) return "Error: none of those candidate_id values came from a tool result. Use IDs returned by search_places or search_at_home.";
      submit({ summary: String(input.summary ?? ""), plans: valid });
      return "Plans received.";
    }
    default:
      return `Unknown tool ${name}`;
  }
}

/** The opening message: the shift request and the scrubbed profile. */
export function planPrompt(s: Session) {
  const pr = pronoun(s.person);
  return `Plan this shift. Person profile (${pr.subj}/${pr.obj}):\n${JSON.stringify(brief(s), null, 1)}`;
}

/** Run the agent loop. Returns null if the agent could not produce plans. */
export async function agentPlan(s: Session): Promise<{ plans: Plan[]; summary: string } | null> {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 2 });
  let result: { plans: Plan[]; summary: string } | null = null;

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: planPrompt(s) }];

  const thinking = s.step("Agent is reading the profile and history", `${MODEL} · ${s.loves.length} loves · ${s.req.outings.filter((o) => o.status === "logged").length} logged outings`);
  let thinkingOpen = true;

  for (let turn = 0; turn < MAX_TURNS && !result; turn++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      tool_choice: { type: "auto" },
      messages,
      output_config: { effort: EFFORT },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (thinkingOpen) {
      thinking.done();
      thinkingOpen = false;
    }

    if (response.stop_reason === "refusal") {
      s.emit({ type: "notice", message: "The agent declined this request, so the rules planner took over." });
      return null;
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const uses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!uses.length) break;
    messages.push({ role: "assistant", content: response.content });

    const results = await Promise.all(
      uses.map(async (u): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        try {
          const content = await runTool(s, u.name, u.input as ToolInput, (r) => (result = r));
          return { type: "tool_result", tool_use_id: u.id, content, is_error: content.startsWith("Error:") };
        } catch (e) {
          return { type: "tool_result", tool_use_id: u.id, content: `Error: ${e instanceof Error ? e.message : "tool failed"}`, is_error: true };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return result;
}
