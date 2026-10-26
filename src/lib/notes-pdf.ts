import type { jsPDF } from "jspdf";
import type { Note } from "./store";
import { renderFormula, splitFormulas } from "./formulas";

export async function appendNotesPdf(doc: jsPDF, notes: Note[], lang: "en" | "ar") {
  const html2canvas = (await import("html2canvas")).default;
  await document.fonts.ready;
  for (const note of notes) {
    const element = document.createElement("div");
    element.className = "pdf-note-export";
    element.dir = lang === "ar" ? "rtl" : "ltr";
    const heading = document.createElement("h2");
    heading.textContent = lang === "ar" ? "الملاحظات" : "Notes";
    element.append(heading);
    const meta = document.createElement("p");
    meta.className = "pdf-note-meta";
    meta.textContent = `${note.deckTitle} · ${new Date(note.createdAt).toLocaleString(lang)}`;
    element.append(meta);
    if (note.questionText) {
      const question = document.createElement("p");
      question.dir = "auto";
      question.textContent = `${lang === "ar" ? "السؤال المرتبط" : "Linked question"}: ${note.questionText}`;
      element.append(question);
    }
    const body = document.createElement("div");
    body.className = "note-preview";
    body.style.whiteSpace = "pre-wrap";
    body.style.overflowWrap = "anywhere";
    body.dir = "auto";
    for (const part of splitFormulas(note.text)) {
      const span = document.createElement("span");
      if (part.math) { span.dir = "ltr"; span.innerHTML = renderFormula(part.text, part.display); }
      else span.textContent = part.text;
      body.append(span);
    }
    element.append(body);
    document.body.append(element);
    try {
      const canvas = await html2canvas(element, { scale: 2, onclone: (cloned) => {
        const original = element.querySelectorAll("*");
        const copy = cloned.querySelector(".pdf-note-export")?.querySelectorAll("*");
        copy?.forEach((node, i) => {
          const source = original[i];
          if (node instanceof HTMLElement && source) {
            const style = getComputedStyle(source);
            node.style.fontFamily = style.fontFamily;
          }
        });
      } });
      const sliceHeight = Math.floor(canvas.width * 265 / 180);
      for (let top = 0; top < canvas.height; top += sliceHeight) {
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(sliceHeight, canvas.height - top);
        const ctx = slice.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        doc.addPage();
        doc.addImage(slice.toDataURL("image/png"), "PNG", 15, 15, 180, slice.height * 180 / slice.width);
      }
    } finally { element.remove(); }
  }
}