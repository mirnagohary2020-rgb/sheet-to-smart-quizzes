import { describe, expect, it } from "vitest";
import { computeStreak, nextSR, todayKey } from "@/lib/store";
import { isCorrect } from "@/lib/fx";

describe("spaced repetition", () => {
  it("wrong answer resets to box 1, due immediately", () => {
    const r = nextSR({ box: 4, due: 0 }, false, 1000);
    expect(r).toEqual({ box: 1, due: 1000 });
  });
  it("correct answer promotes one box", () => {
    expect(nextSR({ box: 2, due: 0 }, true, 0).box).toBe(3);
  });
});

describe("streak", () => {
  it("counts consecutive days ending today", () => {
    const d = new Date(2026, 9, 25);
    const y = new Date(2026, 9, 24);
    expect(computeStreak({ [todayKey(d)]: 3, [todayKey(y)]: 1 }, d)).toBe(2);
  });
});

describe("answer matching", () => {
  it("ignores case and punctuation", () => {
    expect(isCorrect("  mitochondria. ", "Mitochondria")).toBe(true);
    expect(isCorrect("nucleus", "Mitochondria")).toBe(false);
  });
});
