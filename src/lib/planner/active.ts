import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiError } from "@google/genai";
import type { AgentName } from "../types";
import { MODEL as CLAUDE_MODEL, agentConfigured } from "./agent";
import { GEMINI_MODEL, geminiConfigured } from "./gemini";

/** Which model runs the agent: Claude if its key is set, then Gemini, else the rules planner. */
export function activeAgent(): { agent: AgentName; model: string | null } {
  if (agentConfigured()) return { agent: "claude", model: CLAUDE_MODEL };
  if (geminiConfigured()) return { agent: "gemini", model: GEMINI_MODEL };
  return { agent: "rules", model: null };
}

/** A short, staff-readable reason an agent call failed. */
export function agentError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Claude API key was rejected";
  if (e instanceof Anthropic.RateLimitError) return "Claude is rate limited right now";
  if (e instanceof Anthropic.APIError) return `Claude error ${e.status ?? ""}`.trim();
  if (e instanceof GeminiError) {
    if (e.status === 429) return "Gemini is rate limited right now";
    if (e.status === 401 || e.status === 403 || /API key/i.test(e.message)) return "Gemini API key was rejected";
    return `Gemini error ${e.status}`;
  }
  return e instanceof Error ? e.message : "Agent failed";
}
