import LZ from "lz-string";
import type { Deck } from "./store";

export function deckToHash(d: Deck) {
  const { scores: _s, ...rest } = d;
  return LZ.compressToEncodedURIComponent(JSON.stringify(rest));
}
export function hashToDeck(h: string): Deck | null {
  try {
    const d = JSON.parse(LZ.decompressFromEncodedURIComponent(h) ?? "");
    return { ...d, scores: [] };
  } catch {
    return null;
  }
}

export async function exportPdf(d: Deck) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 18;
  const line = (txt: string, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    for (const l of doc.splitTextToSize(txt, 180)) {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(l, 15, y);
      y += size * 0.5;
    }
  };
  line(d.title, 18, true);
  y += 4;
  d.questions.forEach((q, i) => {
    line(`${i + 1}. ${q.question}`, 12, true);
    q.options.forEach((o, j) => line(`   ${String.fromCharCode(65 + j)}) ${o}`));
    y += 3;
  });
  doc.addPage();
  y = 18;
  line("Answer key", 16, true);
  d.questions.forEach((q, i) => line(`${i + 1}. ${q.correct_answer}${q.ai_answer ? " (AI)" : ""} — ${q.explanation}`, 10));
  doc.save(`${d.title.replace(/[^\w]+/g, "_")}.pdf`);
}
