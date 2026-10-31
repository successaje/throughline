import { z } from "zod";
import { activeAgent, agentError } from "@/lib/planner/active";
import { agentPlan } from "@/lib/planner/agent";
import { geminiPlan } from "@/lib/planner/gemini";
import { providerFor } from "@/lib/planner/provider";
import { gatherDefault, rulesPlan } from "@/lib/planner/rules";
import { Session, type PlanRequest } from "@/lib/planner/session";
import type { PlanEvent } from "@/lib/types";

export const maxDuration = 120;

const Body = z.object({
  person: z.object({ id: z.string(), firstName: z.string(), lastName: z.string(), loves: z.array(z.any()), home: z.object({ lat: z.number(), lon: z.number(), label: z.string() }) }).passthrough(),
  outings: z.array(z.any()),
  constraints: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string(),
    end: z.string(),
    budget: z.number().min(0).max(500),
    radiusKm: z.number().min(1).max(80),
    transport: z.enum(["van", "walk", "bus"]),
    includeAtHome: z.boolean(),
  }),
  tagNames: z.record(z.string(), z.string()).default({}),
  seed: z.number().int(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid plan request" }, { status: 400 });
  const body = parsed.data as unknown as PlanRequest;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: PlanEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const provider = providerFor(body.person.loves);
      const { agent } = activeAgent();
      emit({ type: "mode", mode: { qloo: provider.mode, agent } });
      const session = new Session(body, provider, emit);

      try {
        await session.resolveLoves();
        let result = null;
        if (agent !== "rules") {
          try {
            result = agent === "claude" ? await agentPlan(session) : await geminiPlan(session);
          } catch (e) {
            emit({ type: "notice", message: `${agentError(e)}. The rules planner finished this plan.` });
          }
        }
        if (!result) {
          await gatherDefault(session);
          const s = session.step("Ranking with their logged reactions", "Qloo affinity + learned likes and dislikes + one exploration pick");
          result = rulesPlan(session);
          s.done(result.plans.length);
        }
        emit({ type: "plans", plans: result.plans, summary: result.summary });
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Planning failed" });
      } finally {
        emit({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
