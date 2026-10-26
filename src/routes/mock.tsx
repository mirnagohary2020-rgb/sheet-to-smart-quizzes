import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Timer, PenLine, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { NoteEditor, type NoteContext } from "@/components/NoteEditor";
import { uid, useStore, type Question } from "@/lib/store";
import { confetti, isCorrect, shuffle } from "@/lib/fx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/mock")({
  validateSearch: (s: Record<string, unknown>) => ({ decks: String(s["decks"] ?? "") }),
  head: () => ({ meta: [{ title: "Mock exam — QuizForge" }, { name: "description", content: "Timed mock exams." }] }),
  component: MockPage,
});

const STR = {
  en: {
    title: "Mock exam", pool: "Question pool", format: "Format",
    single: "Single exam", singleD: "50 questions · 60 min",
    modules: "Two modules", modulesD: "76 questions · 2 × 45 min, no break",
    warn: (n: number, need: number) => `Only ${n} questions available (needs ${need}). The exam will use all ${n}.`,
    start: "Start exam", module: (a: number, b: number) => `Module ${a} of ${b}`,
    q: (a: number, b: number) => `Question ${a} of ${b}`, flag: "Flag", prev: "Back", next: "Next",
    submitModule: "Submit module", submitExam: "Submit exam",
    confirm: (n: number) => n ? `${n} unanswered. Submit anyway?` : "Submit now?",
    typeAnswer: "Type your answer…", results: "Mock exam results", pass: "PASS", fail: "FAIL",
    time: "Time", review: "Answer review", yours: "Your answer", correct: "Correct answer",
    blank: "(no answer)", again: "New mock exam", home: "Library", addNote: "Add to notes",
    noDecks: "Pick at least one deck.",
  },
  ar: {
    title: "اختبار تجريبي", pool: "مصدر الأسئلة", format: "النوع",
    single: "اختبار واحد", singleD: "50 سؤالاً · 60 دقيقة",
    modules: "وحدتان", modulesD: "76 سؤالاً · 2 × 45 دقيقة بدون استراحة",
    warn: (n: number, need: number) => `يتوفر ${n} سؤالاً فقط (المطلوب ${need}). سيُستخدم ${n} سؤالاً.`,
    start: "ابدأ الاختبار", module: (a: number, b: number) => `الوحدة ${a} من ${b}`,
    q: (a: number, b: number) => `السؤال ${a} من ${b}`, flag: "تعليم", prev: "السابق", next: "التالي",
    submitModule: "إنهاء الوحدة", submitExam: "إنهاء الاختبار",
    confirm: (n: number) => n ? `${n} بدون إجابة. هل تريد الإنهاء؟` : "هل تريد الإنهاء الآن؟",
    typeAnswer: "اكتب إجابتك…", results: "نتيجة الاختبار التجريبي", pass: "ناجح", fail: "راسب",
    time: "الوقت", review: "مراجعة الإجابات", yours: "إجابتك", correct: "الإجابة الصحيحة",
    blank: "(بدون إجابة)", again: "اختبار جديد", home: "المكتبة", addNote: "إضافة إلى الملاحظات",
    noDecks: "اختر مجموعة واحدة على الأقل.",
  },
};

type QQ = Question & { deckId: string };
type Fmt = "single" | "modules";
type Mod = { qs: QQ[]; mins: number };
type ModResult = { answers: Record<string, string>; seconds: number };

const fmtTime = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

function MockPage() {
  const { decks: deckParam } = Route.useSearch();
  const lang = useStore((s) => s.lang);
  const t = STR[lang] ?? STR.en;
  const allDecks = useStore((s) => s.decks);
  const [sel, setSel] = useState<string[]>(() => deckParam.split(",").filter(Boolean));
  const [fmt, setFmt] = useState<Fmt>("modules");
  const [mods, setMods] = useState<Mod[] | null>(null);
  const [runKey, setRunKey] = useState(0);

  const pool: QQ[] = useMemo(
    () => allDecks.filter((d) => sel.includes(d.id)).flatMap((d) => d.questions.map((q) => ({ ...q, deckId: d.id }))),
    [allDecks, sel],
  );
  const need = fmt === "single" ? 50 : 76;

  const build = () => {
    const picked = shuffle(pool).slice(0, need).map((q) => ({ ...q, options: q.type === "mcq" ? shuffle(q.options) : q.options }));
    if (fmt === "single") return [{ qs: picked, mins: 60 }];
    const half = Math.ceil(picked.length / 2);
    return [{ qs: picked.slice(0, half), mins: 45 }, { qs: picked.slice(half), mins: 45 }].filter((m) => m.qs.length);
  };

  if (mods) return <Exam key={runKey} mods={mods} fmt={fmt} deckIds={sel} t={t} onAgain={() => { setMods(null); setRunKey((k) => k + 1); }} />;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="font-display text-3xl font-bold">{t.title}</h1>
      <div className="space-y-3 rounded-3xl border bg-card p-5 shadow-card">
        <p className="font-medium">{t.pool}</p>
        {allDecks.map((d) => (
          <label key={d.id} className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={sel.includes(d.id)}
              onChange={() => setSel(sel.includes(d.id) ? sel.filter((x) => x !== d.id) : [...sel, d.id])} />
            <span className="flex-1 truncate">{d.title}</span>
            <span className="text-muted-foreground">{d.questions.length}</span>
          </label>
        ))}
      </div>
      <div className="space-y-2 rounded-3xl border bg-card p-5 shadow-card">
        <p className="font-medium">{t.format}</p>
        {(["single", "modules"] as const).map((k) => (
          <button key={k} onClick={() => setFmt(k)}
            className={`w-full rounded-xl border p-3 text-start ${fmt === k ? "border-accent bg-accent text-accent-foreground" : "hover:bg-secondary"}`}>
            <p className="font-semibold">{k === "single" ? t.single : t.modules}</p>
            <p className="text-sm opacity-80">{k === "single" ? t.singleD : t.modulesD}</p>
          </button>
        ))}
      </div>
      {pool.length > 0 && pool.length < need && <p className="rounded-xl bg-warning/20 p-3 text-sm">{t.warn(pool.length, need)}</p>}
      <Button variant="hero" size="lg" className="w-full" disabled={!pool.length} onClick={() => setMods(build())}>
        {pool.length ? `${t.start} · ${Math.min(pool.length, need)}` : t.noDecks}
      </Button>
    </div>
  );
}

function Exam({ mods, fmt, deckIds, t, onAgain }: { mods: Mod[]; fmt: Fmt; deckIds: string[]; t: typeof STR.en; onAgain: () => void }) {
  const decks = useStore((s) => s.decks);
  const { recordAnswer, saveSession } = useStore();
  const [m, setM] = useState(0);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ModResult[]>([]);
  const [noteContext, setNoteContext] = useState<NoteContext | null>(null);
  const modStart = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const done = results.length === mods.length;
  const mod = mods[m];
  const q = mod?.qs[i];
  const left = mod ? Math.ceil((modStart.current + mod.mins * 60000 - now) / 1000) : 0;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [done]);

  const finishExam = useCallback((all: ModResult[]) => {
    const merged = Object.assign({}, ...all.map((r) => r.answers)) as Record<string, string>;
    const qs = mods.flatMap((x) => x.qs);
    const res = qs.map((x) => ({ qid: x.id, deckId: x.deckId, correct: isCorrect(merged[x.id] ?? "", x.correct_answer), topic: x.topic || "General", flagged: flags.has(x.id) }));
    res.forEach((r) => recordAnswer(r.qid, r.correct));
    const correct = res.filter((r) => r.correct).length;
    saveSession({ id: uid(), deckIds, at: Date.now(), total: qs.length, correct, seconds: all.reduce((n, r) => n + r.seconds, 0), results: res });
    if (correct / Math.max(1, qs.length) >= 0.6) confetti();
  }, [mods, flags, deckIds, recordAnswer, saveSession]);

  const submitModule = useCallback(() => {
    const seconds = Math.min(mod.mins * 60, Math.round((Date.now() - modStart.current) / 1000));
    const mine = Object.fromEntries(mod.qs.map((x) => [x.id, answers[x.id] ?? ""]));
    const all = [...results, { answers: mine, seconds }];
    setResults(all);
    if (all.length === mods.length) return finishExam(all);
    setM(m + 1); setI(0); modStart.current = Date.now(); setNow(Date.now());
  }, [mod, answers, results, mods.length, m, finishExam]);

  useEffect(() => { if (!done && left <= 0) submitModule(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <Results mods={mods} results={results} fmt={fmt} t={t} onAgain={onAgain} />;

  const unanswered = mod.qs.filter((x) => !(answers[x.id] ?? "").trim()).length;
  const isChoice = q.type === "mcq" || q.type === "true_false";
  const last = m === mods.length - 1;
  const setAns = (v: string) => setAnswers((a) => ({ ...a, [q.id]: v }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{mods.length > 1 ? `${t.module(m + 1, mods.length)} · ` : ""}{t.q(i + 1, mod.qs.length)}</span>
        <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${left <= 300 ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>
          <Timer className="size-4" /> {fmtTime(left)}
        </span>
      </div>

      <div className="grid grid-cols-10 gap-1.5">
        {mod.qs.map((x, j) => (
          <button key={x.id} onClick={() => setI(j)}
            className={`relative rounded-md border py-1 text-xs font-semibold ${j === i ? "border-accent ring-1 ring-accent" : ""} ${(answers[x.id] ?? "").trim() ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {j + 1}{flags.has(x.id) && <span className="absolute -top-1 end-0 size-2 rounded-full bg-warning" />}
          </button>
        ))}
      </div>

      <div className="space-y-5 rounded-3xl border bg-card p-6 shadow-card">
        <div className="flex items-start gap-2">
          {q.topic && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{q.topic}</span>}
          <button onClick={() => setFlags((f) => { const n = new Set(f); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
            className={`ms-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${flags.has(q.id) ? "bg-warning text-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Flag className="size-3" /> {t.flag}
          </button>
        </div>
        <h2 className="whitespace-pre-wrap font-display text-xl font-bold leading-snug sm:text-2xl">{q.question}</h2>
        {isChoice ? (
          <div className="grid gap-2">
            {q.options.map((o, j) => (
              <button key={j} onClick={() => setAns(o)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-start font-medium ${answers[q.id] === o ? "border-accent bg-accent/15" : "hover:border-accent"}`}>
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold">{j + 1}</span>{o}
              </button>
            ))}
          </div>
        ) : (
          <Input value={answers[q.id] ?? ""} onChange={(e) => setAns(e.target.value)} placeholder={t.typeAnswer} className="h-12 rounded-2xl" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="rtl:rotate-180" /> {t.prev}</Button>
        <Button variant="outline" disabled={i === mod.qs.length - 1} onClick={() => setI(i + 1)}>{t.next} <ChevronRight className="rtl:rotate-180" /></Button>
        <Button variant="hero" onClick={() => confirm(t.confirm(unanswered)) && submitModule()}>{last ? t.submitExam : t.submitModule}</Button>
      </div>

      <Button size="icon" aria-label={t.addNote} title={t.addNote}
        className="fixed bottom-6 end-6 z-40 size-12 rounded-full border border-accent bg-primary text-primary-foreground"
        onClick={() => setNoteContext({ deckId: q.deckId, deckTitle: decks.find((d) => d.id === q.deckId)?.title ?? q.topic, questionId: q.id, questionText: q.question })}>
        <PenLine />
      </Button>
      {noteContext && <NoteEditor context={noteContext} onClose={() => setNoteContext(null)} />}
    </div>
  );
}

function Results({ mods, results, fmt, t, onAgain }: { mods: Mod[]; results: ModResult[]; fmt: Fmt; t: typeof STR.en; onAgain: () => void }) {
  const nav = useNavigate();
  const per = mods.map((m, k) => ({ c: m.qs.filter((x) => isCorrect(results[k].answers[x.id], x.correct_answer)).length, n: m.qs.length, s: results[k].seconds }));
  const c = per.reduce((a, p) => a + p.c, 0), n = per.reduce((a, p) => a + p.n, 0);
  const pct = Math.round((c / Math.max(1, n)) * 100);
  const pass = pct >= 60;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-3xl border bg-card p-8 text-center shadow-card">
        <p className="text-sm text-muted-foreground">{t.results} · {fmt === "single" ? "Mock 50" : "Mock 76"}</p>
        <p className="font-display text-6xl font-bold">{pct}%</p>
        <p className="mt-1">{c} / {n} · {t.time} {fmtTime(per.reduce((a, p) => a + p.s, 0))}</p>
        <span className={`mt-3 inline-block rounded-full px-4 py-1 text-sm font-bold ${pass ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>{pass ? t.pass : t.fail}</span>
      </div>
      {mods.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          {per.map((p, k) => (
            <div key={k} className="rounded-2xl border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">{t.module(k + 1, mods.length)}</p>
              <p className="font-display text-2xl font-bold">{p.c}/{p.n}</p>
              <p className="text-xs text-muted-foreground">{t.time} {fmtTime(p.s)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3 rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t.review}</h2>
        {mods.flatMap((m, k) => m.qs.map((x, j) => {
          const given = results[k].answers[x.id] ?? "";
          const ok = isCorrect(given, x.correct_answer);
          return (
            <div key={x.id} className={`space-y-1 rounded-xl border-s-4 p-3 text-sm ${ok ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}`}>
              <p className="font-medium">{mods.length > 1 ? `M${k + 1}·` : ""}{j + 1}. {x.question}</p>
              <p><span className="text-muted-foreground">{t.yours}:</span> {given || t.blank}</p>
              {!ok && <p><span className="text-muted-foreground">{t.correct}:</span> <b>{x.correct_answer}</b></p>}
              {x.explanation && <p className="text-xs text-muted-foreground">{x.explanation}</p>}
            </div>
          );
        }))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="hero" size="lg" onClick={onAgain}>{t.again}</Button>
        <Button variant="ghost" size="lg" onClick={() => nav({ to: "/" })}><Home /> {t.home}</Button>
      </div>
    </div>
  );
}
