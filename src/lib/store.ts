import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QType = "mcq" | "true_false" | "short_answer" | "fill_blank";
export interface Question {
  id: string;
  question: string;
  type: QType;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  ai_answer: boolean;
}
export interface Deck {
  id: string;
  title: string;
  subject: string;
  questions: Question[];
  createdAt: number;
  scores: { pct: number; at: number }[];
}
export interface Session {
  id: string;
  deckIds: string[];
  at: number;
  total: number;
  correct: number;
  seconds: number;
  results: { qid: string; deckId: string; correct: boolean; topic: string; flagged: boolean }[];
}
export interface Note {
  id: string;
  deckId: string;
  deckTitle: string;
  createdAt: number;
  updatedAt: number;
  text: string;
  questionId?: string;
  questionText?: string;
}
/** Leitner-style spaced repetition box per question. */
export interface SRItem {
  box: number; // 1..5
  due: number; // timestamp
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const DAY = 86400000;
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 14];

export function nextSR(prev: SRItem | undefined, correct: boolean, now = Date.now()): SRItem {
  const box = correct ? Math.min(5, (prev?.box ?? 1) + 1) : 1;
  return { box, due: now + BOX_INTERVAL_DAYS[box] * DAY };
}

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function computeStreak(activity: Record<string, number>, now = new Date()): number {
  let streak = 0;
  const d = new Date(now);
  if (!activity[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (activity[todayKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

interface State {
  decks: Deck[];
  notes: Note[];
  saveNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  sessions: Session[];
  sr: Record<string, SRItem>;
  activity: Record<string, number>;
  dailyGoal: number;
  sound: boolean;
  theme: "light" | "dark";
  lang: "en" | "ar";
  draft: Deck | null;
  addDeck: (d: Deck) => void;
  updateDeck: (d: Deck) => void;
  deleteDeck: (id: string) => void;
  setDraft: (d: Deck | null) => void;
  recordAnswer: (qid: string, correct: boolean) => void;
  saveSession: (s: Session) => void;
  set: (p: Partial<Pick<State, "dailyGoal" | "sound" | "theme" | "lang">>) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      decks: [],
      notes: [],
      saveNote: (note) => set((s) => ({ notes: s.notes.some((n) => n.id === note.id)
        ? s.notes.map((n) => n.id === note.id ? note : n)
        : [note, ...s.notes] })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      sessions: [],
      sr: {},
      activity: {},
      dailyGoal: 10,
      sound: true,
      theme: "light",
      lang: "en",
      draft: null,
      addDeck: (d) => set((s) => ({ decks: [d, ...s.decks] })),
      updateDeck: (d) => set((s) => ({ decks: s.decks.map((x) => (x.id === d.id ? d : x)) })),
      deleteDeck: (id) => set((s) => ({ decks: s.decks.filter((x) => x.id !== id) })),
      setDraft: (draft) => set({ draft }),
      recordAnswer: (qid, correct) =>
        set((s) => {
          const k = todayKey();
          return {
            sr: { ...s.sr, [qid]: nextSR(s.sr[qid], correct) },
            activity: { ...s.activity, [k]: (s.activity[k] ?? 0) + 1 },
          };
        }),
      saveSession: (sess) =>
        set((s) => {
          const pct = sess.total ? Math.round((sess.correct / sess.total) * 100) : 0;
          return {
            sessions: [sess, ...s.sessions].slice(0, 300),
            decks: s.decks.map((d) =>
              sess.deckIds.includes(d.id) ? { ...d, scores: [...d.scores, { pct, at: sess.at }] } : d,
            ),
          };
        }),
      set: (p) => set(p),
    }),
    { name: "quizforge-v1" },
  ),
);
