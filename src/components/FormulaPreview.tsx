import { splitFormulas, renderFormula } from "@/lib/formulas";

export function FormulaPreview({ text }: { text: string }) {
  return <div className="note-preview whitespace-pre-wrap break-words leading-relaxed" dir="auto">
    {splitFormulas(text).map((part, i) => part.math
      ? <span key={i} dir="ltr" className={part.display ? "block overflow-x-auto" : "inline-block max-w-full overflow-x-auto align-middle"}
          dangerouslySetInnerHTML={{ __html: renderFormula(part.text, part.display) }} />
      : <span key={i}>{part.text}</span>)}
  </div>;
}