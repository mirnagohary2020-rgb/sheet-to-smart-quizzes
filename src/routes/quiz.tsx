import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Flag, Timer, X, Sparkles, RotateCcw, Home } from "lucide-react";
import { uid, useStore, type Question } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { beep, confetti, isCorrect, shuffle } from "@/lib/fx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/quiz")({
  validateSearch: (s: Record<string, unknown>) => ({
    decks: String(s["decks"] ?? ""),
    mode: (s["mode"] === "sr" ? "sr" : "normal") as "sr" | "normal",
  }),
  head: () => ({
    meta: [
      { title: "Quiz — QuizForge" },
      { name: "description", content: "Answer one question at a time with instant feedback." },
      { property: "og:title", content: "Quiz — QuizForge" },
      { property: "og:description", content: "Practise with instant feedback." },
    ],
  }),
  component: QuizPage,
});

type QQ = Question & { deckId: string };
type Ans = { qid: string; deckId: string; given: string; correct: boolean; topic: string; flagged: boolean };
type Settings = { shuffleQ: boolean; shuffleC: boolean; timer: "none" | "per" | "whole"; secs: number; sr: boolean };

function QuizPage() {
  const { decks: deckParam, mode } = Route.useSearch();
  const ids = deckParam.split(",").filter(Boolean);
  const allDecks = useStore((s) => s.decks);
  const decks = useMemo(() => allDecks.filter((d) => ids.includes(d.id)), [allDecks, deckParam]); // eslint-disable-line react-hooks/exhaustive-deps
  const sr = useStore((s) => s.sr);
  const t = useT();
  const pool: QQ[] = useMemo(() => decks.flatMap((d) => d.questions.map((q) => ({ ...q, deckId: d.id }))), [deckParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const [settings, setSettings] = useState<Settings>({ shuffleQ: true, shuffleC: true, timer: "none", secs: 30, sr: mode === "sr" });
  const [run, setRun] = useState<QQ[] | null>(null);
  const [runKey, setRunKey] = useState(0);

  const build = (qs: QQ[], s: Settings) => {
    let list = qs;
    if (s.sr) {
      const now = Date.now();
      list = [...qs].sort((a, b) => {
        const A = sr[a.id], B = sr[b.id];
        const sa = A ? (A.due <= now ? A.box : 10 + A.box) : 5;
        const sb = B ? (B.due <= now ? B.box : 10 + B.box) : 5;
        return sa - sb;
      }).slice(0, 20);
      if (s.shuffleQ) list = shuffle(list);
    } else if (s.shuffleQ) list = shuffle(list);
    return list.map((q) => ({ ...q, options: s.shuffleC && q.type === "mcq" ? shuffle(q.options) : q.options }));
  };

  if (!pool.length) return <Link to="/" className="text-primary">← {t.home}</Link>;

  if (!run)
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">{decks.map((d) => d.title).join(" + ")}</p>
          <h1 className="font-display text-3xl font-bold">{t.settings}</h1>
        </div>
        <div className="space-y-4 rounded-3xl border bg-card p-5 shadow-card">
          <Row label={t.shuffleQ}><Switch checked={settings.shuffleQ} onCheckedChange={(v) => setSettings({ ...settings, shuffleQ: v })} /></Row>
          <Row label={t.shuffleC}><Switch checked={settings.shuffleC} onCheckedChange={(v) => setSettings({ ...settings, shuffleC: v })} /></Row>
          <Row label={t.spaced} hint={t.spacedHint}><Switch checked={settings.sr} onCheckedChange={(v) => setSettings({ ...settings, sr: v })} /></Row>
          <div className="space-y-2">
            <p className="font-medium">{t.timer}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["none", "per", "whole"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSettings({ ...settings, timer: k, secs: k === "whole" ? 10 : 30 })}
                  className={`rounded-xl border py-2 text-sm font-medium ${settings.timer === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  {k === "none" ? t.none : k === "per" ? t.perQ : t.whole}
                </button>
              ))}
            </div>
            {settings.timer !== "none" && (
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={settings.secs} onChange={(e) => setSettings({ ...settings, secs: Math.max(1, +e.target.value) })} className="w-24" />
                <span className="text-sm text-muted-foreground">{settings.timer === "per" ? t.seconds : t.minutes}</span>
              </div>
            )}
          </div>
        </div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => setRun(build(pool, settings))}>
          {t.start} · {settings.sr ? Math.min(20, pool.length) : pool.length} {t.questions}
        </Button>
      </div>
    );

  return (
    <Player
      key={runKey}
      qs={run}
      settings={settings}
      deckIds={ids}
      onRetry={(wrong) => { setRun(build(wrong, { ...settings, sr: false })); setRunKey((k) => k + 1); }}
      onAgain={() => { setRun(build(pool, settings)); setRunKey((k) => k + 1); }}
    />
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div><p className="font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </div>
  );
}

function Player({ qs, settings, deckIds, onRetry, onAgain }: { qs: QQ[]; settings: Settings; deckIds: string[]; onRetry: (w: QQ[]) => void; onAgain: () => void }) {
  const t = useT();
  const { recordAnswer, saveSession } = useStore();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Ans[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const startAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const qStart = useRef(Date.now());
  const [anim, setAnim] = useState(0);
  const q = qs[i];
  const answered = picked !== null;

  useEffect(() => {
    if (settings.timer === "none" || done) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [settings.timer, done]);

  const finish = useCallback((all: Ans[]) => {
    setDone(true);
    const correct = all.filter((a) => a.correct).length;
    saveSession({
      id: uid(), deckIds, at: Date.now(), total: qs.length, correct,
      seconds: Math.round((Date.now() - startAt.current) / 1000),
      results: all.map(({ qid, deckId, correct, topic, flagged }) => ({ qid, deckId, correct, topic, flagged })),
    });
    if (correct === qs.length && qs.length) confetti();
  }, [deckIds, qs.length, saveSession]);

  const answer = useCallback((given: string) => {
    if (answered || done) return;
    const ok = isCorrect(given, q.correct_answer);
    setPicked(given);
    beep(ok);
    recordAnswer(q.id, ok);
    setAnswers((a) => [...a, { qid: q.id, deckId: q.deckId, given, correct: ok, topic: q.topic || "General", flagged: flags.has(q.id) }]);
  }, [answered, done, q, recordAnswer, flags]);

  const next = useCallback(() => {
    if (!answered) return;
    if (i + 1 >= qs.length) return finish(answers);
    setI(i + 1);
    setPicked(null);
    setTyped("");
    setAnim((a) => a + 1);
    qStart.current = Date.now();
  }, [answered, i, qs.length, answers, finish]);

  // timers
  const left = settings.timer === "per"
    ? settings.secs - Math.floor((now - qStart.current) / 1000)
    : settings.timer === "whole" ? settings.secs * 60 - Math.floor((now - startAt.current) / 1000) : null;
  useEffect(() => {
    if (left === null || left > 0 || done) return;
    if (settings.timer === "per" && !answered) answer("\u0000");
    if (settings.timer === "whole") {
      const rest = qs.slice(answers.length + (answered ? 0 : 0)).filter((x) => !answers.some((a) => a.qid === x.id));
      finish([...answers, ...rest.map((x) => ({ qid: x.id, deckId: x.deckId, given: "", correct: false, topic: x.topic || "General", flagged: false }))]);
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (done) return;
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "Enter") {
        if (answered) { e.preventDefault(); next(); }
        else if (tag === "INPUT" && typed.trim()) { e.preventDefault(); answer(typed); }
        return;
      }
      if (tag === "INPUT") return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= q.options.length) answer(q.options[n - 1]);
      if (e.key.toLowerCase() === "f") toggleFlag();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // swipe
  const touch = useRef<number | null>(null);
  const toggleFlag = () => setFlags((f) => { const n = new Set(f); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });

  if (done) return <Results qs={qs} answers={answers} flags={flags} seconds={Math.round((Date.now() - startAt.current) / 1000)} onRetry={onRetry} onAgain={onAgain} />;

  const isChoice = q.type === "mcq" || q.type === "true_false";
  const ok = answered && isCorrect(picked!, q.correct_answer);

  return (
    <div
      className="mx-auto max-w-2xl space-y-5"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        const rtl = document.documentElement.dir === "rtl";
        if ((rtl ? dx : -dx) > 70) next();
        touch.current = null;
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{t.questionOf(i + 1, qs.length)}</span>
          {left !== null && (
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${left <= 5 ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>
              <Timer className="size-4" />
              {settings.timer === "whole" ? `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, "0")}` : Math.max(0, left)}
            </span>
          )}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-ember transition-all duration-500" style={{ width: `${((i + (answered ? 1 : 0)) / qs.length) * 100}%` }} />
        </div>
      </div>

      <div key={anim} className="animate-in-up space-y-5 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {q.topic && <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">{q.topic}</span>}
            <span className="rounded-full bg-secondary px-2 py-0.5">{q.difficulty}</span>
          </div>
          <button onClick={toggleFlag} className={`ms-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${flags.has(q.id) ? "bg-warning text-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Flag className="size-3" /> {t.flag}
          </button>
        </div>
        <h2 className="whitespace-pre-wrap font-display text-2xl font-bold leading-snug sm:text-3xl">{q.question}</h2>

        {isChoice ? (
          <div className="grid gap-3">
            {q.options.map((o, j) => {
              const isAns = isCorrect(o, q.correct_answer);
              const state = !answered ? "idle" : isAns ? "right" : o === picked ? "wrong" : "dim";
              return (
                <button
                  key={j}
                  disabled={answered}
                  onClick={() => answer(o)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-start text-lg font-medium transition-all ${
                    state === "idle" ? "hover:-translate-y-0.5 hover:border-primary active:scale-[0.99]" :
                    state === "right" ? "border-success bg-success/15" :
                    state === "wrong" ? "border-destructive bg-destructive/15" : "opacity-50"}`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${state === "right" ? "bg-success text-success-foreground" : state === "wrong" ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>
                    {state === "right" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : j + 1}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2">
            <Input autoFocus disabled={answered} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t.typeAnswer} className={`h-14 rounded-2xl text-lg ${answered ? (ok ? "border-success" : "border-destructive") : ""}`} />
            {!answered && <Button size="lg" className="h-14" disabled={!typed.trim()} onClick={() => answer(typed)}>{t.submit}</Button>}
          </div>
        )}

        {answered && (
          <div className={`animate-in-up space-y-1 rounded-2xl p-4 ${ok ? "bg-success/15" : "bg-destructive/10"}`}>
            <p className="font-display text-lg font-bold">{ok ? t.correct : picked === "\u0000" ? t.timeUp : t.wrong}</p>
            {!ok && <p><span className="text-muted-foreground">{t.correctAnswer}:</span> <b>{q.correct_answer}</b></p>}
            {q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
            {q.ai_answer && <p className="flex items-center gap-1 text-xs font-medium text-primary"><Sparkles className="size-3" /> {t.aiFlag}</p>}
          </div>
        )}
      </div>

      {answered && (
        <Button variant="hero" size="lg" className="w-full" onClick={next}>
          {t.next} <span className="hidden text-xs opacity-70 sm:inline">↵</span>
        </Button>
      )}
      <p className="hidden text-center text-xs text-muted-foreground sm:block">1–4 · Enter · F</p>
    </div>
  );
}

function Results({ qs, answers, flags, seconds, onRetry, onAgain }: { qs: QQ[]; answers: Ans[]; flags: Set<string>; seconds: number; onRetry: (w: QQ[]) => void; onAgain: () => void }) {
  const t = useT();
  const nav = useNavigate();
  const correct = answers.filter((a) => a.correct).length;
  const pct = Math.round((correct / Math.max(1, qs.length)) * 100);
  const topics = Object.entries(
    answers.reduce<Record<string, { c: number; n: number }>>((m, a) => {
      m[a.topic] ??= { c: 0, n: 0 };
      m[a.topic].n++;
      if (a.correct) m[a.topic].c++;
      return m;
    }, {}),
  );
  const wrongIds = new Set(answers.filter((a) => !a.correct).map((a) => a.qid));
  const wrong = qs.filter((q) => wrongIds.has(q.id));
  const flagged = qs.filter((q) => flags.has(q.id));

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="animate-in-up rounded-3xl bg-ember p-8 text-center text-primary-foreground shadow-glow">
        <p className="text-sm font-semibold opacity-80">{t.results}</p>
        <p className="font-display text-7xl font-extrabold">{pct}%</p>
        <p className="mt-1 opacity-90">{correct} / {qs.length} · {t.time} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
      </div>
      <div className="space-y-3 rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t.byTopic}</h2>
        {topics.map(([k, v]) => (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-sm"><span className="font-medium">{k}</span><span>{v.c}/{v.n}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-success" style={{ width: `${(v.c / v.n) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {flagged.length > 0 && (
        <div className="space-y-2 rounded-3xl border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Flag className="size-4" /> {t.flagged}</h2>
          {flagged.map((q) => <p key={q.id} className="text-sm"><b>{q.question}</b> — {q.correct_answer}</p>)}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        {wrong.length > 0 && <Button variant="hero" size="lg" onClick={() => onRetry(wrong)}><RotateCcw /> {t.retryWrong}</Button>}
        <Button variant="outline" size="lg" onClick={onAgain}>{t.again}</Button>
        <Button variant="ghost" size="lg" onClick={() => nav({ to: "/" })}><Home /> {t.home}</Button>
      </div>
    </div>
  );
}
