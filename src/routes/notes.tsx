import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NotebookPen, Pencil, Search, Trash2 } from "lucide-react";
import { useStore, type Note } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { filterNotes } from "@/lib/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormulaPreview } from "@/components/FormulaPreview";
import { NoteEditor } from "@/components/NoteEditor";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [
    { title: "Notes — QuizForge" },
    { name: "description", content: "Search and edit your deck-linked quiz notes and formulas." },
    { property: "og:title", content: "Notes — QuizForge" },
    { property: "og:description", content: "Your quiz notes, linked questions and formulas in one place." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NotesPage,
});

function NotesPage() {
  const t = useT();
  const { notes, decks, deleteNote, lang } = useStore();
  const [search, setSearch] = useState("");
  const [deckId, setDeckId] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const shown = filterNotes(notes, search, deckId);
  const options = new Map([...notes.map((n) => [n.deckId, n.deckTitle] as const), ...decks.map((d) => [d.id, d.title] as const)]);
  return <div className="space-y-6">
    <h1 className="font-display text-4xl font-bold">{t.notes}</h1>
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-12 bg-card ps-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchNotes} aria-label={t.searchNotes} />
      </div>
      <select className="h-12 max-w-full rounded-lg border bg-card px-3 text-sm sm:max-w-64" value={deckId} onChange={(e) => setDeckId(e.target.value)} aria-label={t.allDecks}>
        <option value="">{t.allDecks}</option>
        {[...options].map(([id, title]) => <option key={id} value={id}>{title}</option>)}
      </select>
    </div>
    {!shown.length && <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><NotebookPen className="size-8 text-accent" /><p>{notes.length ? t.noMatchingNotes : t.noNotes}</p></div>}
    <div className="grid items-start gap-4 sm:grid-cols-2">
      {shown.map((note) => <article key={note.id} className="min-w-0 space-y-3 rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><h2 className="break-words font-display text-lg font-bold">{decks.find((d) => d.id === note.deckId)?.title ?? note.deckTitle}</h2>
            <time className="text-xs text-muted-foreground" dateTime={new Date(note.createdAt).toISOString()}>{new Date(note.createdAt).toLocaleString(lang === "ar" ? "ar" : "en")}</time>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" aria-label={t.editNote} title={t.editNote} onClick={() => setEditing(note)}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label={t.delete} title={t.delete} onClick={() => { if (confirm(t.deleteNote)) deleteNote(note.id); }}><Trash2 className="text-destructive" /></Button>
          </div>
        </div>
        {note.questionText && <div className="border-s-2 border-accent ps-3 text-sm text-muted-foreground"><p className="mb-1 text-xs">{t.linkedQuestion}</p><p dir="auto">{note.questionText}</p></div>}
        <FormulaPreview text={note.text} />
      </article>)}
    </div>
    {editing && <NoteEditor key={editing.id} initial={editing} context={editing} onClose={() => setEditing(null)} />}
  </div>;
}