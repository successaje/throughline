"use client";

import { useEffect, useState } from "react";

export interface Status {
  qloo: "live" | "sample";
  agent: "claude" | "rules";
  model: string | null;
}

let cached: Promise<Status> | undefined;

/** Which integrations the server has keys for. Fetched once per page load. */
export function useStatus() {
  const [status, setStatus] = useState<Status>();
  useEffect(() => {
    cached ??= fetch("/api/status").then((r) => r.json() as Promise<Status>);
    let alive = true;
    cached.then((s) => alive && setStatus(s)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return status;
}
