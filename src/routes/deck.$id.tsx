import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { DeckEditor } from "@/components/DeckEditor";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/deck/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Edit deck — QuizForge" },
      { name: "description", content: "Edit, reorder and merge questions in your deck." },
      { property: "og:title", content: "Edit deck — QuizForge" },
      { property: "og:description", content: "Edit your QuizForge deck." },
    ],
  }),
  component: EditDeck,
});

function EditDeck() {
  const { id } = Route.useParams();
  const deck = useStore((s) => s.decks.find((d) => d.id === id));
  const update = useStore((s) => s.updateDeck);
  const nav = useNavigate();
  const t = useT();
  if (!deck) return <Link to="/" className="text-primary">← {t.home}</Link>;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">{t.edit}</h1>
      <DeckEditor initial={deck} onSave={(d) => { update(d); nav({ to: "/" }); }} />
    </div>
  );
}
