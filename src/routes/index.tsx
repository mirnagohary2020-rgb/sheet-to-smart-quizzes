import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Brain, Download, Layers, MoreVertical, Pencil, Plus, Search, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useStore, type Deck } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { deckToHash } from "@/lib/share";
import { PdfExportDialog } from "@/components/PdfExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "QuizForge — Turn practice sheets into quizzes" },
      { name: "description", content: "Upload practice sheets and practise them as interactive one-question-at-a-time quizzes." },
      { property: "og:title", content: "QuizForge — Turn practice sheets into quizzes" },
      { property: "og:description", content: "Upload practice sheets and practise them as interactive quizzes." },
    ],
  }),
  component: Library,
});

function Library() {
  const t = useT();
  const nav = useNavigate();
  const { decks, sessions, sr, deleteDeck } = useStore();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [exportDeck, setExportDeck] = useState<Deck | null>(null);

  const subjects = useMemo(() => [...new Set(decks.map((d) => d.subject))], [decks]);
  const shown = decks.filter((d) => !subject || d.subject === subject);
  const hits = useMemo(() => {
    if (q.trim().length < 2) return [];
    const n = q.toLowerCase();
    return decks.flatMap((d) =>
      d.questions.filter((x) => (x.question + " " + x.topic + " " + x.options.join(" ")).toLowerCase().includes(n)).map((x) => ({ d, x })),
    ).slice(0, 30);
  }, [q, decks]);
  const dueCount = decks.reduce((n, d) => n + d.questions.filter((x) => sr[x.id] && sr[x.id].due <= Date.now()).length, 0);
  const chart = [...sessions].reverse().slice(-20).map((s, i) => ({ i: i + 1, pct: Math.round((s.correct / Math.max(1, s.total)) * 100) }));

  const start = (ids: string[], mode: "normal" | "sr" = "normal") =>
    nav({ to: "/quiz", search: { decks: ids.join(","), mode } });

  return (
    <div className="space-y-6">
      {exportDeck && <PdfExportDialog deck={exportDeck} onClose={() => setExportDeck(null)} />}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">{t.library}</h1>
          <p className="text-muted-foreground">{decks.length} decks · {decks.reduce((n, d) => n + d.questions.length, 0)} {t.questions}</p>
        </div>
        <Link to="/upload" className="sm:hidden">
          <Button variant="hero" size="icon" className="size-12 rounded-2xl"><Plus /></Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="h-12 rounded-2xl bg-card ps-10" />
      </div>

      {hits.length > 0 && (
        <div className="space-y-2 rounded-3xl border bg-card p-3 shadow-card">
          {hits.map(({ d, x }) => (
            <Link key={x.id} to="/deck/$id" params={{ id: d.id }} className="block rounded-xl p-2 hover:bg-secondary">
              <p className="line-clamp-2 text-sm font-medium">{x.question}</p>
              <p className="text-xs text-muted-foreground">{d.title} · {x.topic}</p>
            </Link>
          ))}
        </div>
      )}

      {(dueCount > 0 || sel.length > 1) && <div className="flex flex-wrap gap-2">
        {dueCount > 0 && (
          <Button variant="hero" onClick={() => start(decks.map((d) => d.id), "sr")}>
            <Brain /> {t.review} ({dueCount})
          </Button>
        )}
        {sel.length > 1 && (
          <Button onClick={() => start(sel)}><Layers /> {t.combine} ({sel.length})</Button>
        )}
      </div>}

      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[null, ...subjects].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setSubject(s)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${subject === s ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:bg-secondary"}`}
            >
              {s ?? t.all}
            </button>
          ))}
        </div>
      )}

      {decks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-card p-12 text-center">
          <BookOpen className="size-10 text-primary" />
          <p className="max-w-xs text-muted-foreground">{t.noDecks}</p>
          <Link to="/upload"><Button variant="hero" size="lg"><Plus /> {t.upload}</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((d) => {
            const last = d.scores.at(-1)?.pct;
            const best = d.scores.length ? Math.max(...d.scores.map((s) => s.pct)) : undefined;
            const on = sel.includes(d.id);
            return (
              <div key={d.id} className={`animate-in-up flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow-card transition-all ${on ? "ring-1 ring-accent" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setSel(on ? sel.filter((x) => x !== d.id) : [...sel, d.id])}
                    className="mt-1.5 size-4 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{d.subject}</span>
                    <h3 className="mt-1 truncate font-display text-lg font-bold">{d.title}</h3>
                    <p className="text-sm text-muted-foreground">{d.questions.length} {t.questions}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreVertical /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => nav({ to: "/deck/$id", params: { id: d.id } })}><Pencil /> {t.edit}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setExportDeck(d)}><Download /> {t.export}</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const url = `${location.origin}/share?d=${deckToHash(d)}`;
                          if (navigator.share) await navigator.share({ title: d.title, url }).catch(() => {});
                          else { await navigator.clipboard.writeText(url); toast.success(t.copied); }
                        }}
                      >
                        <Share2 /> {t.share}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => confirm(`${t.delete}?`) && deleteDeck(d.id)}>
                        <Trash2 /> {t.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Stat label={t.last} v={last} />
                  <Stat label={t.best} v={best} />
                  <Button variant="hero" className="ms-auto" onClick={() => start([d.id])}>{t.start}</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {chart.length > 1 && (
        <div className="rounded-3xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-display text-lg font-bold">{t.progress}</h2>
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <XAxis dataKey="i" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} width={30} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Line type="monotone" dataKey="pct" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v?: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{v === undefined ? "—" : `${v}%`}</p>
    </div>
  );
}
