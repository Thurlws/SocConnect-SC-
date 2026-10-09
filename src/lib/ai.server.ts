import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, type ModelMessage } from "ai";
import type { z } from "zod";

const BASE = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(401, "AI is not configured.");
  return createOpenAI({
    baseURL: BASE,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

const opts = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
};

function friendly(e: unknown): AiError {
  const status = (e as { statusCode?: number })?.statusCode ?? (e instanceof AiError ? e.status : 500);
  if (status === 429) return new AiError(429, "The AI is busy right now — try again in a moment.");
  if (status === 402) return new AiError(402, "AI credits have run out. Add credits in Settings → Plans & credits.");
  if (status === 403) return new AiError(403, "AI access is not available for this workspace right now.");
  return new AiError(status, e instanceof Error ? e.message : "The AI request failed.");
}

export async function aiText(instructions: string, messages: ModelMessage[]) {
  try {
    const result = streamText({ model: provider().responses(MODEL), instructions, messages, maxRetries: 0, providerOptions: opts });
    return await result.text;
  } catch (e) {
    throw friendly(e);
  }
}

export async function aiObject<T>(instructions: string, prompt: string, schema: z.ZodType<T>) {
  try {
    const result = streamText({
      model: provider().responses(MODEL),
      instructions,
      messages: [{ role: "user", content: prompt }],
      output: Output.object({ schema }),
      maxRetries: 0,
      providerOptions: opts,
    });
    return (await result.output) as T;
  } catch (e) {
    throw friendly(e);
  }
}
