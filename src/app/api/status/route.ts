import { connection } from "next/server";
import { activeAgent } from "@/lib/planner/active";
import { qlooConfigured } from "@/lib/qloo";

export async function GET() {
  // Read keys at request time, not at build time.
  await connection();
  return Response.json({ qloo: qlooConfigured() ? "live" : "sample", ...activeAgent() });
}
