# Throughline

**Community outings that fit the person, learned from how each one went, and kept when staff change.**

Throughline is for direct support professionals (DSPs) who support adults with intellectual and developmental disabilities in Medicaid home- and community-based services. Qloo suggests real local places that match what someone loves. Staff log a 10-second reaction after each outing. Those reactions re-rank every future suggestion, and the whole record stays with the person when staff leave.

Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com/). **Live demo:** https://throughline-eight-sigma.vercel.app

## The problem

- **Turnover.** DSP turnover was 37% in 2024, and 64% of the staff who left had been there under a year ([NCI-IDD State of the Workforce 2024](https://idd.nationalcoreindicators.org/wp-content/uploads/2025/12/SotW-IDD-2024-At-a-Glance.pdf)).
- **Lost knowledge.** Every departure takes with it what works for each person. A new staff member falls back on the same group trip to the park or the mall.
- **The rules require more.** Federal HCBS rules require person-centered planning and real community integration ([42 CFR 441.301(c)](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-C/part-441/subpart-G/section-441.301)).
- **Records don't answer the question.** Care records log what happened. They don't suggest where to go next, or learn from how it went.

## How it works

1. **Qloo proposes.** An agent turns a person's loves (Selena, horses, tacos) into Qloo searches for real places near them. Each search filters to places open that weekday, under the budget's price level, and within travel distance. Where needed it also filters for a step-free entrance. Qloo's explainability shows which love drove each match.
2. **Their reactions decide.** After an outing, staff tap one of three reactions (*lit up*, *fine*, *not for them*) plus optional tags (*too loud*, *wanted to stay*).
   - Each log updates a per-person Beta posterior for every place feature: Qloo tags plus traits like quiet, outdoors and animals.
   - Ranking blends Qloo affinity with what the logs taught. Places marked *not for them* are excluded from future searches.
   - Thompson sampling picks one new place worth learning from.
3. **The record survives turnover.** The handoff card is one printable page: what lights them up, what to steer clear of, places to go back to, and how to support them. Every line comes from the profile or a logged outing. Progress-note drafts cite the log entries they come from.

## What makes it Qloo-powered

| Qloo endpoint | Used for |
|---|---|
| `GET /search` | Matching each love to a Qloo entity (artist, film, show, brand) |
| `GET /v2/tags` (semantic search) | Matching interests ("horses", "tacos") to tags, and finding the wheelchair-accessible-entrance tag |
| `GET /v2/insights`, `filter.type=urn:entity:place` | Real places, using `signal.interests.entities` / `.tags`, `filter.location` + `.radius`, `filter.hours`, `filter.price_level.max`, `filter.tags` (accessibility), `filter.exclude.entities` (past "not for them"), `bias.quality`, `feature.explainability` |
| `GET /v2/insights`, `filter.type=urn:entity:movie` | Cross-domain at-home ideas for low-energy days |

Qloo supplies the taste prior, which no care record has. Throughline adds what Qloo can't know: how this one person actually reacted.

## The agent

The planner is a tool-using agent on Claude (`claude-opus-5-5` by default). When only a Gemini key is set, the same agent runs on Gemini (`gemini-flash-latest` by default), with the same prompt, tools and limits. The code is in [src/lib/planner/agent.ts](src/lib/planner/agent.ts) and [src/lib/planner/gemini.ts](src/lib/planner/gemini.ts).

**Tools:**
- `search_places`: Qloo places, re-scored by the person's own model.
- `find_tags`: Qloo tag lookup.
- `search_at_home`: Qloo cross-domain media.
- `submit_plans`: the final plans. Every plan must reference a candidate a tool returned.

**What the agent can't change:** location, opening day, price ceiling and past "not for them" exclusions are enforced in code, never left to the model.

**What the agent sees:** the profile with the name removed (pronouns only). Qloo receives only IDs, coordinates and filters.

The staff member sees each step live, including the exact Qloo request.

The app degrades gracefully, and the UI always labels which mode is running:
- **No `ANTHROPIC_API_KEY`:** Gemini runs the agent if `GEMINI_API_KEY` is set.
- **No Claude or Gemini key:** a rules planner runs the same Qloo searches and ranking model.
- **No `QLOO_API_KEY`:** a labeled sample mode uses fictional places with simulated affinity.

## Run it

```bash
npm install
cp .env.example .env.local   # add QLOO_API_KEY, plus ANTHROPIC_API_KEY or GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Four fictional people and six weeks of labeled sample history load on first visit; **Settings → Reset demo data** restores them.

**Try this:**
1. Open **Maria → Plan an outing**.
2. Choose the *Something new* plan, then **Log how it went** → *Not for them* + *Too loud*.
3. Watch the ranked list reorder and the "Learned from…" note appear.
4. Open the **Handoff card**.

## Deploy

Deploy to Vercel (or any Node host). Set `QLOO_API_KEY`, `QLOO_API_URL`, and `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` as environment variables. No database is required for the demo.

## Stack

- **Framework:** Next.js 16 (App Router, Cache Components), React 19, TypeScript.
- **UI:** Tailwind CSS v4 and shadcn/ui (Radix), Motion, Zustand.
- **AI:** Anthropic TypeScript SDK, Google Gen AI SDK.

**Project layout:**

```
src/lib/qloo.ts             Qloo client and response normalization
src/lib/model.ts            per-person preference model (Beta posteriors, Thompson sampling)
src/lib/planner/            Claude and Gemini agents, rules planner, live/sample providers, run session
src/app/api/plan/route.ts   streaming plan endpoint (NDJSON events)
src/app/(app)/              Today, People, record, planner, handoff card, settings
```

## Honest limits

- **Demo storage:** records live in the browser's local storage. Production needs per-agency storage with access control and audit logs.
- **Sample history:** the seeded people and history are fictional and labeled as samples in the UI.
- **No real pilot yet:** this hasn't been tested with a real agency. The next step is a two-week pilot with one agency and five people, measuring logging rate, new places tried, and time saved on notes.
- **Coverage gaps:** Qloo's place coverage is thinner in small towns. Libraries, community centers and events are not in its place taxonomy.

## License

[MIT](LICENSE)
