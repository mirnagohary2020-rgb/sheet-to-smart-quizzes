import type { Note } from "./store";

export const DEFAULT_LINK_QUESTION = true;

export function filterNotes(notes: Note[], search: string, deckId = "") {
  const query = search.trim().toLocaleLowerCase();
  return notes.filter((n) => (!deckId || n.deckId === deckId) &&
    (!query || `${n.text} ${n.deckTitle} ${n.questionText ?? ""}`.toLocaleLowerCase().includes(query)));
}

export function notesForExport(notes: Note[], deckId: string, includeNotes: boolean) {
  return includeNotes ? notes.filter((n) => n.deckId === deckId) : [];
}

export function questionLink(link: boolean, questionId?: string, questionText?: string) {
  return link && questionId ? { questionId, questionText } : { questionId: undefined, questionText: undefined };
}