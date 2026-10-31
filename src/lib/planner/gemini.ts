import "server-only";

// Gemini runs the same agent as Claude: same prompt, same four tools, same
// hard limits enforced in runTool. It is used when only a Gemini key is set.

import { FunctionCallingConfigMode, GoogleGenAI, type Content, type FunctionDeclaration, type Part } from "@google/genai";
import type { Plan } from "../types";
import { MAX_TURNS, SYSTEM, TOOLS, planPrompt, runTool, type ToolInput } from "./agent";
import type { Session } from "./session";

const apiKey = () => process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

export const geminiConfigured = () => Boolean(apiKey());

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

const DECLARATIONS: FunctionDeclaration[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema,
}));

export const geminiClient = () => new GoogleGenAI({ apiKey: apiKey() });

const asJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Run the agent loop on Gemini. Returns null if it could not produce plans. */
export async function geminiPlan(s: Session): Promise<{ plans: Plan[]; summary: string } | null> {
  const ai = geminiClient();
  let result: { plans: Plan[]; summary: string } | null = null;

  const contents: Content[] = [{ role: "user", parts: [{ text: planPrompt(s) }] }];

  const thinking = s.step("Agent is reading the profile and history", `${GEMINI_MODEL} · ${s.loves.length} loves · ${s.req.outings.filter((o) => o.status === "logged").length} logged outings`);
  let thinkingOpen = true;

  for (let turn = 0; turn < MAX_TURNS && !result; turn++) {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM,
        tools: [{ functionDeclarations: DECLARATIONS }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        abortSignal: AbortSignal.timeout(90_000),
      },
    });
    if (thinkingOpen) {
      thinking.done();
      thinkingOpen = false;
    }

    const candidate = response.candidates?.[0];
    if (response.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") {
      s.emit({ type: "notice", message: "The agent declined this request, so the rules planner took over." });
      return null;
    }

    const calls = response.functionCalls ?? [];
    if (!calls.length || !candidate?.content) break;
    // Send the model's turn back unchanged so its thought signatures survive.
    contents.push(candidate.content);

    const parts = await Promise.all(
      calls.map(async (c): Promise<Part> => {
        let output: string;
        try {
          output = await runTool(s, c.name ?? "", (c.args ?? {}) as ToolInput, (r) => (result = r));
        } catch (e) {
          output = `Error: ${e instanceof Error ? e.message : "tool failed"}`;
        }
        return {
          functionResponse: { id: c.id, name: c.name, response: output.startsWith("Error:") ? { error: output } : { output: asJson(output) } },
        };
      }),
    );
    contents.push({ role: "user", parts });
  }
  return result;
}
