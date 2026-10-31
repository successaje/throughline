import { connection } from "next/server";
import { agentConfigured } from "@/lib/planner/agent";
import { qlooConfigured } from "@/lib/qloo";

export async function GET() {
  // Read keys at request time, not at build time.
  await connection();
  return Response.json({
    qloo: qlooConfigured() ? "live" : "sample",
    agent: agentConfigured() ? "claude" : "rules",
    model: agentConfigured() ? (process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5") : null,
  });
}
