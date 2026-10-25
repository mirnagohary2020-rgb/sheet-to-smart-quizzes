import { useState } from "react";
import { ArrowDown, ArrowUp, Merge, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Deck, Question, QType } from "@/lib/store";
import { uid } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DeckEditor({ initial, onSave }: { initial: Deck; onSave: (d: Deck) => void }) {
  const t = useT();
  const [deck, setDeck] = useState(initial);
  const qs = deck.questions;
  const setQs = (questions: Question[]) => setDeck({ ...deck, questions });
  const upd = (i: number, p: Partial<Question>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    const n = [...qs];
    [n[i], n[j]] = [n[j], n[i]];
    setQs(n);
  };
  const merge = (i: number) => {
    if (i >= qs.length - 1) return;
    const a = qs[i], b = qs[i + 1];
    const m: Question = {
      ...a,
      question: `${a.question}\n${b.question}`,
      options: [...a.options, ...b.options],
      explanation: [a.explanation, b.explanation].filter(Boolean).join(" "),
      ai_answer: a.ai_answer || b.ai_answer,
    };
    setQs([...qs.slice(0, i), m, ...qs.slice(i + 2)]);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-3xl border bg-card p-4 shadow-card sm:grid-cols-[2fr_1fr]">
        <label className="space-y-1 text-sm font-medium">
          {t.title}
          <Input value={deck.title} onChange={(e) => setDeck({ ...deck, title: e.target.value })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          {t.subject}
          <Input value={deck.subject} onChange={(e) => setDeck({ ...deck, subject: e.target.value })} />
        </label>
      </div>

      {qs.map((q, i) => (
        <div key={q.id} className="animate-in-up space-y-3 rounded-3xl border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
            <select
              className="h-8 rounded-lg border bg-background px-2 text-sm"
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as QType;
                upd(i, {
                  type,
                  options: type === "true_false" ? ["True", "False"] : type === "mcq" ? q.options : [],
                });
              }}
            >
              <option value="mcq">MCQ</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short answer</option>
              <option value="fill_blank">Fill in blank</option>
            </select>
            {q.ai_answer && (
              <button
                onClick={() => upd(i, { ai_answer: false })}
                title="Mark verified"
                className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-accent-foreground"
              >
                <Sparkles className="size-3" /> {t.aiFlag}
              </button>
            )}
            <div className="ms-auto flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" title={t.merge} onClick={() => merge(i)}><Merge /></Button>
              <Button size="icon" variant="ghost" onClick={() => setQs(qs.filter((_, j) => j !== i))}>
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
          <Textarea value={q.question} onChange={(e) => upd(i, { question: e.target.value })} className="min-h-16 text-base" />
          {(q.type === "mcq" || q.type === "true_false") && (
            <div className="space-y-2">
              {q.options.map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={o === q.correct_answer}
                    onChange={() => upd(i, { correct_answer: o })}
                    className="size-4 accent-[var(--success)]"
                  />
                  <Input
                    value={o}
                    onChange={(e) => {
                      const opts = [...q.options];
                      opts[j] = e.target.value;
                      upd(i, { options: opts, correct_answer: q.correct_answer === o ? e.target.value : q.correct_answer });
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => upd(i, { options: q.options.filter((_, k) => k !== j) })}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {q.type === "mcq" && (
                <Button size="sm" variant="outline" onClick={() => upd(i, { options: [...q.options, ""] })}>
                  <Plus /> Option
                </Button>
              )}
            </div>
          )}
          {(q.type === "short_answer" || q.type === "fill_blank") && (
            <label className="block space-y-1 text-sm font-medium">
              {t.answer}
              <Input value={q.correct_answer} onChange={(e) => upd(i, { correct_answer: e.target.value })} />
            </label>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_10rem_8rem]">
            <Input placeholder={t.explanation} value={q.explanation} onChange={(e) => upd(i, { explanation: e.target.value })} />
            <Input placeholder={t.topic} value={q.topic} onChange={(e) => upd(i, { topic: e.target.value })} />
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={q.difficulty}
              onChange={(e) => upd(i, { difficulty: e.target.value as Question["difficulty"] })}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          setQs([
            ...qs,
            { id: uid(), question: "", type: "mcq", options: ["", ""], correct_answer: "", explanation: "", topic: deck.subject, difficulty: "medium", ai_answer: false },
          ])
        }
      >
        <Plus /> Question
      </Button>
      <div className="sticky bottom-4 z-10">
        <Button variant="hero" size="lg" className="w-full" disabled={!qs.length} onClick={() => onSave(deck)}>
          {t.save} · {qs.length} {t.questions}
        </Button>
      </div>
    </div>
  );
}
