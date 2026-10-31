"use client";

import { useEffect, useState } from "react";
import { Book, Clapperboard, Hash, Loader2, MapPin, Mic, Music, Plus, ShoppingBag, Tv, X, type LucideIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStatus } from "@/hooks/use-status";
import type { Love } from "@/lib/types";

const TYPE_ICON: Record<string, LucideIcon> = {
  "urn:entity:artist": Music,
  "urn:entity:movie": Clapperboard,
  "urn:entity:tv_show": Tv,
  "urn:entity:book": Book,
  "urn:entity:podcast": Mic,
  "urn:entity:brand": ShoppingBag,
  "urn:entity:place": MapPin,
};

/** Icon for a love's Qloo type. */
export function LoveIcon({ love, className }: { love: Pick<Love, "type" | "kind">; className?: string }) {
  const Icon = love.kind === "tag" ? Hash : (TYPE_ICON[love.type] ?? Hash);
  return <Icon className={className} />;
}

const TYPE_LABEL: Record<string, string> = {
  "urn:entity:artist": "Artist",
  "urn:entity:movie": "Film",
  "urn:entity:tv_show": "TV",
  "urn:entity:book": "Book",
  "urn:entity:podcast": "Podcast",
  "urn:entity:brand": "Brand",
  "urn:entity:place": "Place",
};

export const loveTypeLabel = (love: Pick<Love, "type" | "kind">) => (love.kind === "tag" ? "Interest" : (TYPE_LABEL[love.type] ?? "Interest"));

interface Hit {
  id: string;
  name: string;
  kind: "entity" | "tag";
  type: string;
  subtitle?: string;
}

export function LoveChip({ love, onRemove }: { love: Love; onRemove?: () => void }) {
  const status = useStatus();
  const unmatched = status?.qloo === "live" && (love.id.startsWith("seed:") || love.id.startsWith("local:"));
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-card pr-1 pl-2.5 text-sm">
      <LoveIcon love={love} className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{love.name}</span>
      <span className="text-xs text-muted-foreground">{loveTypeLabel(love)}</span>
      {unmatched && <span className="size-1.5 rounded-full bg-lit" title="Matched to Qloo on the next plan" />}
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${love.name}`} className="ml-0.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-3" />
        </button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  );
}

export function LovesEditor({ loves, onChange }: { loves: Love[]; onChange: (loves: Love[]) => void }) {
  const status = useStatus();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  const searching = status?.qloo === "live" && query.trim().length >= 2;

  useEffect(() => {
    if (!searching) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { results: Hit[] }) => setHits(d.results ?? []))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, searching]);
  const shownHits = searching ? hits : [];

  const add = (love: Love) => {
    if (!loves.some((l) => l.id === love.id || l.name.toLowerCase() === love.name.toLowerCase())) onChange([...loves, love]);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {loves.map((l) => (
        <LoveChip key={l.id} love={l} onRemove={() => onChange(loves.filter((x) => x.id !== l.id))} />
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-full">
            <Plus data-icon="inline-start" />
            Add a love
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder="An artist, film, show, food, hobby…" />
            <CommandList>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Searching Qloo
                </div>
              )}
              {!loading && searching && shownHits.length === 0 && <CommandEmpty>No Qloo match.</CommandEmpty>}
              {shownHits.length > 0 && (
                <CommandGroup heading="From Qloo">
                  {shownHits.map((h) => {
                    return (
                      <CommandItem key={`${h.kind}-${h.id}`} value={h.id} onSelect={() => add({ id: h.id, name: h.name, kind: h.kind, type: h.type })}>
                        <LoveIcon love={h} className="text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate">{h.name}</p>
                          {h.subtitle && <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p>}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {query.trim().length >= 2 && (
                <CommandGroup heading={status?.qloo === "live" ? "Or" : "Sample mode"}>
                  <CommandItem
                    value={`local-${query}`}
                    onSelect={() => add({ id: `local:${query.trim().toLowerCase().replace(/\s+/g, "-")}`, name: query.trim(), kind: "tag", type: "urn:tag:keyword" })}
                  >
                    <Plus className="text-muted-foreground" />
                    <span>
                      Add “{query.trim()}” as an interest
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
              {query.trim().length < 2 && (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {status?.qloo === "live" ? "Type to search Qloo's entities and interest tags." : "Add a key to search Qloo. You can still add interests by name."}
                </p>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
