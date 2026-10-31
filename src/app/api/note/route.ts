import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { agentConfigured } from "@/lib/planner/agent";

export const maxDuration = 60;

const Body = z.object({
  pronouns: z.string(),
  goal: z.string().default("Take part in community activities chosen around personal interests."),
  outings: z
    .array(
      z.object({
        n: z.number(),
        date: z.string(),
        place: z.string(),
        reaction: z.string(),
        tags: z.array(z.string()),
        note: z.string().optional(),
      }),
    )
    .max(60),
});

const SYSTEM = `You draft monthly progress notes for adults in Medicaid home- and community-based services. Write from logged outings only. Every sentence that states a fact ends with the log numbers it rests on, like [3] or [2, 5]. Do not infer diagnoses, causes, or anything not in the logs. Refer to the person as {{name}} or by their pronouns. Plain, professional, 120 to 180 words, three short paragraphs: participation, what worked and what didn't, suggested next steps. No headings.`;

/** Draft a progress note from logs. The person's name never leaves the browser. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!agentConfigured()) return Response.json({ mode: "rules" });

  const client = new Anthropic({ timeout: 45_000, maxRetries: 2 });
  try {
    const response = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(parsed.data) }],
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") return Response.json({ mode: "rules" });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return Response.json({ mode: "claude", text });
  } catch (e) {
    const message = e instanceof Anthropic.APIError ? `Claude error ${e.status ?? ""}`.trim() : "Note drafting failed";
    return Response.json({ mode: "rules", error: message });
  }
}
