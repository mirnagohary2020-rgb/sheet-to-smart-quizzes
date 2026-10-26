import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_LINK_QUESTION, filterNotes, notesForExport, questionLink } from "@/lib/notes";
import { useStore, type Note } from "@/lib/store";
import { renderFormula, splitFormulas } from "@/lib/formulas";

const note: Note = { id: "n1", deckId: "d1", deckTitle: "Algebra", text: "Area \\(x^2\\)", createdAt: 1000, updatedAt: 1000, questionId: "q1", questionText: "Find the area" };
beforeEach(() => useStore.setState({ notes: [] }));
describe("notes", () => {
  it("links the current question by default", () => {
    expect(DEFAULT_LINK_QUESTION).toBe(true);
    expect(questionLink(DEFAULT_LINK_QUESTION, "q1", "Find the area")).toEqual({ questionId: "q1", questionText: "Find the area" });
  });
  it("omits the question when unchecked", () => {
    expect(questionLink(false, "q1", "Find the area")).toEqual({ questionId: undefined, questionText: undefined });
  });
  it("persists notes with deck, date and question and supports edit and delete", async () => {
    useStore.getState().saveNote(note);
    await useStore.persist.rehydrate();
    expect(useStore.getState().notes[0]).toEqual(note);
    useStore.getState().saveNote({ ...note, text: "Updated", updatedAt: 2000 });
    expect(useStore.getState().notes).toEqual([{ ...note, text: "Updated", updatedAt: 2000 }]);
    useStore.getState().deleteNote("n1");
    expect(useStore.getState().notes).toEqual([]);
  });
  it("searches note and question text and filters by deck", () => {
    const other = { ...note, id: "n2", deckId: "d2", text: "مساحة المربع" };
    expect(filterNotes([note, other], "area", "d1")).toEqual([note]);
    expect(filterNotes([note, other], "مساحة", "d2")).toEqual([other]);
    expect(filterNotes([note, other], "area", "d2")).toEqual([]);
  });
  it("exports only opted-in notes for the selected deck", () => {
    expect(notesForExport([note], "d1", false)).toEqual([]);
    expect(notesForExport([note], "d1", true)).toEqual([note]);
    expect(notesForExport([note], "d2", true)).toEqual([]);
  });
  it("parses inline and display formulas and renders safe KaTeX", () => {
    expect(splitFormulas("Area \\(x^2\\) $$a+b$$").filter((p) => p.math)).toEqual([
      { text: "x^2", math: true, display: false }, { text: "a+b", math: true, display: true },
    ]);
    expect(renderFormula("x^2", false)).toContain("<math");
    expect(renderFormula("\\href{javascript:alert(1)}{x}", false)).not.toContain('href="javascript:');
  });
});