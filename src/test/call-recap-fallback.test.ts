import { describe, expect, it } from "vitest";

import { callScript } from "./call-script";
import { fallbackAnswer, fallbackSummary } from "@/lib/call-recap-fallback";

const transcript = callScript("CompSoc", ["Priya Nair", "Sam Okafor", "Jordan Lee"]).map(
  (l, i) => ({
    ...l,
    at: i * 5,
  }),
);

describe("call recap fallback", () => {
  it("summarises without inventing owners", () => {
    const s = fallbackSummary(transcript);
    expect(s.source).toBe("fallback");
    expect(s.overview).toMatch(/3 people/);
    expect(s.topics).toContain("Booking");
    // First-person commitments keep the speaker; everything else is "Someone".
    expect(s.actionItems).toContainEqual({
      owner: "Jordan Lee",
      task: "I can take that, I'll email the students' union tomorrow.",
    });
    expect(s.actionItems.find((a) => a.task.startsWith("We should"))?.owner).toBe("Someone");
    expect(s.decisions.some((d) => d.includes("Agreed"))).toBe(true);
  });

  it("returns empty sections for small talk", () => {
    const s = fallbackSummary([
      { speaker: "Alex Morgan", text: "Hi everyone, how's it going?", at: 3 },
    ]);
    expect(s.decisions).toEqual([]);
    expect(s.actionItems).toEqual([]);
    expect(s.overview).toMatch(/1 person/);
  });

  it("answers questions by quoting the transcript", () => {
    expect(fallbackAnswer(transcript, "What did we decide?")).toMatch(/Agreed/);
    expect(fallbackAnswer(transcript, "What do I need to do?")).toMatch(/students' union/);
    expect(fallbackAnswer(transcript, "What about the budget?")).toMatch(/150 euro/);
    expect(fallbackAnswer(transcript, "Who brings the pizza?")).toMatch(/couldn't find/);
  });
});
