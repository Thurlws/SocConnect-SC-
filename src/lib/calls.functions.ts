import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fallbackAnswer, fallbackSummary } from "./call-recap-fallback";

const line = z.object({ speaker: z.string().max(80), text: z.string().max(2000), at: z.number() });
const transcriptToText = (t: z.infer<typeof line>[]) =>
  t
    .map(
      (l) =>
        `[${Math.floor(l.at / 60)}:${String(Math.floor(l.at % 60)).padStart(2, "0")}] ${l.speaker}: ${l.text}`,
    )
    .join("\n");

const summarySchema = z.object({
  overview: z.string(),
  topics: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(z.object({ owner: z.string(), task: z.string() })),
});

export const summarizeCall = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      society: z.string().max(120),
      title: z.string().max(200),
      transcript: z.array(line).min(1).max(600),
    }),
  )
  .handler(async ({ data }) => {
    const { aiObject } = await import("./ai.server");
    try {
      const summary = await aiObject(
        "You summarise student society video calls. Write in a friendly, clear tone — not corporate, not slangy. Overview: 1–2 sentences. Topics: short labels. Decisions: only things actually agreed. Action items: who will do what; use 'Someone' if no owner was named. Use empty arrays when there is nothing. Never invent facts.",
        `Society: ${data.society}\nCall: ${data.title}\n\nTranscript:\n${transcriptToText(data.transcript)}`,
        summarySchema,
      );
      return { ...summary, source: "ai" as const };
    } catch (e) {
      // Never dead-end the demo: no key, no credits or a rate limit all fall back to a keyword recap.
      console.warn("AI summary unavailable, using fallback:", e instanceof Error ? e.message : e);
      return fallbackSummary(data.transcript);
    }
  });

export const askAboutCall = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().max(200),
      transcript: z.array(line).max(600),
      history: z
        .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
        .max(40),
      question: z.string().min(1).max(1000),
    }),
  )
  .handler(async ({ data }) => {
    const { aiText } = await import("./ai.server");
    try {
      const answer = await aiText(
        `You are the SocConnect call assistant. Answer questions about this call using only the transcript below. Be concise and friendly; use short markdown lists when helpful. If the transcript doesn't cover it, say so.\n\nCall: ${data.title}\nTranscript:\n${transcriptToText(data.transcript)}`,
        [...data.history, { role: "user", content: data.question }],
      );
      return { answer };
    } catch (e) {
      console.warn("AI Q&A unavailable, using fallback:", e instanceof Error ? e.message : e);
      return { answer: fallbackAnswer(data.transcript, data.question) };
    }
  });
