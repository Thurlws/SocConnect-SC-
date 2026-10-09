/**
 * Deterministic call recap used when the AI service is unavailable (no API key, out of credits,
 * rate limited, offline). Keyword-based and deliberately conservative: it only quotes or counts
 * what was said and never invents decisions or owners.
 */
import type { CallSummary, TranscriptLine } from "@/lib/types";

type Line = Pick<TranscriptLine, "speaker" | "text" | "at">;

const DECISION =
  /\b(agreed|agree|decided|confirmed|let's go with|we'll go with|let's keep|let's lock|let's do)\b/i;
const ACTION =
  /\b(i'll|i will|i can|we'll|we will|we should|we need to|need to|can you|could you|will you)\b/i;
const FIRST_PERSON = /\b(i'll|i will|i can)\b/i;

const STOP = new Set(
  "about after again also because before being could every first from going great have here into just know like little maybe next only other really should some something still that their them then there these they thing think this those time today tomorrow very want were what when where which while will with would your yeah okay everyone shall good".split(
    " ",
  ),
);

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const words = (text: string) => text.toLowerCase().match(/[a-z']+/g) ?? [];

function keywords(lines: Line[], max: number) {
  const counts = new Map<string, number>();
  for (const l of lines)
    for (const w of new Set(words(l.text)))
      if (w.length >= 6 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([w]) => w[0]!.toUpperCase() + w.slice(1));
}

export function fallbackSummary(transcript: Line[], durationSec?: number): CallSummary {
  const speakers = [...new Set(transcript.map((l) => l.speaker))];
  const seconds = durationSec ?? transcript.at(-1)?.at ?? 0;
  const minutes = Math.max(1, Math.round(seconds / 60));
  const decisions = transcript.filter((l) => DECISION.test(l.text));
  const actions = transcript.filter((l) => !DECISION.test(l.text) && ACTION.test(l.text));

  return {
    source: "fallback",
    overview: `${speakers.length} ${speakers.length === 1 ? "person" : "people"} spoke over about ${minutes} min (${transcript.length} transcript lines). The AI summariser wasn't available, so this is a keyword-based recap. Check the transcript for detail.`,
    topics: keywords(transcript, 4),
    decisions: decisions.map((l) => `${l.speaker}: "${l.text}"`),
    actionItems: actions.map((l) => ({
      owner: FIRST_PERSON.test(l.text) ? l.speaker : "Someone",
      task: l.text,
    })),
  };
}

export function fallbackAnswer(transcript: Line[], question: string): string {
  const note = "_The AI assistant isn't available right now, so here's what the transcript says._";
  const q = question.toLowerCase();
  const quote = (ls: Line[]) =>
    ls.map((l) => `- **${l.speaker}** (${clock(l.at)}): ${l.text}`).join("\n");

  if (/decid|agree|decision/.test(q)) {
    const hits = transcript.filter((l) => DECISION.test(l.text));
    return hits.length
      ? `${note}\n\n${quote(hits)}`
      : `${note}\n\nNothing in the transcript sounds like a decision.`;
  }
  if (/\b(to ?do|action|task|need to|i do|next steps?)\b/.test(q)) {
    const hits = transcript.filter((l) => ACTION.test(l.text));
    return hits.length
      ? `${note}\n\n${quote(hits)}`
      : `${note}\n\nNo one took on a task in the transcript.`;
  }
  const terms = words(q).filter((w) => w.length >= 4 && !STOP.has(w));
  const hits = transcript
    .filter((l) => terms.some((t) => l.text.toLowerCase().includes(t)))
    .slice(0, 6);
  if (hits.length) return `${note}\n\n${quote(hits)}`;
  if (/summar|sentence|overview/.test(q))
    return `${note}\n\n${fallbackSummary(transcript).overview}`;
  return `${note}\n\nI couldn't find anything about that in the transcript.`;
}
