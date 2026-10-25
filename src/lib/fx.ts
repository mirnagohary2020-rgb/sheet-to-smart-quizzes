import { useStore } from "./store";

let ctx: AudioContext | null = null;
export function beep(good: boolean) {
  if (!useStore.getState().sound || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const notes = good ? [660, 880] : [220, 180];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx!.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.16);
    });
  } catch {
    /* ignore */
  }
}

export async function confetti() {
  const c = (await import("canvas-confetti")).default;
  c({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
}

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const norm = (s: string) =>
  s.toLowerCase().replace(/[\s.,;:!?'"()]+/g, " ").trim();

export function isCorrect(given: string, expected: string) {
  return norm(given) === norm(expected) && norm(given) !== "";
}
