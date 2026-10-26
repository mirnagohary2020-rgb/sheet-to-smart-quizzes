import { useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/lib/i18n";
import { useStore, uid, type Note } from "@/lib/store";
import { DEFAULT_LINK_QUESTION, questionLink } from "@/lib/notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FormulaPreview } from "./FormulaPreview";

export interface NoteContext { deckId: string; deckTitle: string; questionId?: string; questionText?: string }

export function NoteEditor({ initial, context, onClose }: { initial?: Note; context: NoteContext; onClose: () => void }) {
  const t = useT();
  const mobile = useIsMobile();
  const lang = useStore((s) => s.lang);
  const saveNote = useStore((s) => s.saveNote);
  const [text, setText] = useState(initial?.text ?? "");
  const [link, setLink] = useState(initial ? Boolean(initial.questionId) : DEFAULT_LINK_QUESTION);
  const save = () => {
    if (!text.trim()) return;
    const now = Date.now();
    saveNote({ id: initial?.id ?? uid(), deckId: context.deckId, deckTitle: context.deckTitle,
      text: text.trim(), createdAt: initial?.createdAt ?? now, updatedAt: now,
      ...questionLink(link, context.questionId, context.questionText) });
    toast.success(t.noteSaved);
    onClose();
  };
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side={mobile ? "bottom" : lang === "ar" ? "left" : "right"}
      aria-describedby={undefined} dir={lang === "ar" ? "rtl" : "ltr"}
      onKeyDown={(event) => event.stopPropagation()}
      className={mobile ? "max-h-[85dvh] overflow-y-auto rounded-t-xl" : "w-full overflow-y-auto sm:max-w-lg"}>
      <div className="space-y-5">
        <SheetTitle className="pe-8 font-display text-2xl">{initial ? t.editNote : t.addNote}</SheetTitle>
        <p className="text-sm text-muted-foreground">{context.deckTitle}</p>
        {context.questionText && <p className="max-h-24 overflow-y-auto text-sm" dir="auto">{context.questionText}</p>}
        <label className="block space-y-2 text-sm font-medium">
          <span>{t.noteText}</span>
          <Textarea autoFocus dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.notePlaceholder} className="min-h-36" />
        </label>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">{t.preview}</h3>
          <div className="min-h-20 max-h-60 overflow-y-auto border-y py-3"><FormulaPreview text={text} /></div>
        </section>
        {context.questionId && <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={link} onCheckedChange={(v) => setLink(v === true)} />{t.linkQuestion}
        </label>}
        <div className="flex gap-2 pb-2">
          <Button className="flex-1" disabled={!text.trim()} onClick={save}>{t.saveNote}</Button>
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>;
}