import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { hashToDeck } from "@/lib/share";
import { uid, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/share")({
  validateSearch: (s: Record<string, unknown>) => ({ d: String(s.d ?? "") }),
  head: () => ({
    meta: [
      { title: "Shared quiz deck — QuizForge" },
      { name: "description", content: "Someone shared a QuizForge deck with you." },
      { property: "og:title", content: "Shared quiz deck — QuizForge" },
      { property: "og:description", content: "Import this deck and start practising." },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { d } = Route.useSearch();
  const deck = useMemo(() => hashToDeck(d), [d]);
  const add = useStore((s) => s.addDeck);
  const nav = useNavigate();
  const t = useT();
  if (!deck) return <p className="text-muted-foreground">Invalid link.</p>;
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border bg-card p-6 text-center shadow-card">
      <p className="text-sm text-muted-foreground">{deck.subject}</p>
      <h1 className="font-display text-3xl font-bold">{deck.title}</h1>
      <p>{deck.questions.length} {t.questions}</p>
      <Button
        variant="hero"
        size="lg"
        className="w-full"
        onClick={() => {
          const id = uid();
          add({ ...deck, id, createdAt: Date.now(), questions: deck.questions.map((q) => ({ ...q, id: uid() })) });
          nav({ to: "/quiz", search: { decks: id, mode: "normal" } });
        }}
      >
        {t.import} & {t.start}
      </Button>
    </div>
  );
}
