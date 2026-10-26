import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { type Deck, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { exportPdf } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function PdfExportDialog({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const t = useT();
  const { notes, lang } = useStore();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent aria-describedby={undefined} dir={lang === "ar" ? "rtl" : "ltr"} className="w-[calc(100%-2rem)] rounded-lg">
      <DialogTitle>{t.export}</DialogTitle><p className="break-words text-muted-foreground">{deck.title}</p>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeNotes} onCheckedChange={(v) => setIncludeNotes(v === true)} />{t.includeNotes} ({notes.filter((n) => n.deckId === deck.id).length})</label>
      <Button disabled={busy} onClick={async () => {
        setBusy(true);
        try { await exportPdf(deck, { notes, includeNotes, lang }); onClose(); }
        catch { toast.error(t.exportFailed); }
        finally { setBusy(false); }
      }}><Download />{t.export}{busy ? "…" : ""}</Button>
    </DialogContent>
  </Dialog>;
}