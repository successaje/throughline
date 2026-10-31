import { findTags, qlooConfigured, searchEntities } from "@/lib/qloo";

const TYPES = new Set([
  "urn:entity:artist",
  "urn:entity:movie",
  "urn:entity:tv_show",
  "urn:entity:book",
  "urn:entity:podcast",
  "urn:entity:brand",
  "urn:entity:videogame",
  "urn:entity:place",
]);

/** Look up a love in Qloo: entities first, then interest tags. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";
  if (q.length < 2) return Response.json({ mode: qlooConfigured() ? "live" : "sample", results: [] });
  if (!qlooConfigured()) return Response.json({ mode: "sample", results: [] });

  try {
    const [entities, tags] = await Promise.all([
      searchEntities(q, TYPES.has(type) ? type : undefined),
      type && type !== "tag" ? Promise.resolve([]) : findTags(q).catch(() => []),
    ]);
    return Response.json({
      mode: "live",
      results: [
        ...entities.slice(0, 6).map((e) => ({ id: e.id, name: e.name, kind: "entity", type: e.type, subtitle: e.subtitle, image: e.image })),
        ...tags.slice(0, 4).map((t) => ({ id: t.id, name: t.name, kind: "tag", type: t.type ?? "urn:tag", subtitle: "Interest" })),
      ],
    });
  } catch (e) {
    return Response.json({ mode: "live", results: [], error: e instanceof Error ? e.message : "Search failed" }, { status: 502 });
  }
}
