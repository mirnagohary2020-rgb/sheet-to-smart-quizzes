import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileUp, Hammer } from "lucide-react";
import { toast } from "sonner";
import { extractQuestions } from "@/lib/ai/extract.functions";
import { uid, useStore, type Deck } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DeckEditor } from "@/components/DeckEditor";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a practice sheet — QuizForge" },
      { name: "description", content: "Upload PDF, DOCX, scans or text and extract quiz questions with AI." },
      { property: "og:title", content: "Upload a practice sheet — QuizForge" },
      { property: "og:description", content: "Extract quiz questions from any practice sheet." },
    ],
  }),
  component: UploadPage,
});

const readAs = (f: File, how: "dataURL" | "text" | "buffer") =>
  new Promise<string | ArrayBuffer>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string | ArrayBuffer);
    r.onerror = rej;
    if (how === "dataURL") r.readAsDataURL(f);
    else if (how === "text") r.readAsText(f);
    else r.readAsArrayBuffer(f);
  });

async function shrinkImage(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const max = 2000;
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * s;
  c.height = img.height * s;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

function UploadPage() {
  const t = useT();
  const nav = useNavigate();
  const { draft, setDraft, addDeck, lang } = useStore();
  const extract = useServerFn(extractQuestions);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [text, setText] = useState("");
  const inp = useRef<HTMLInputElement>(null);

  const run = async (payload: Parameters<typeof extract>[0]["data"], name: string) => {
    setBusy(true);
    try {
      const r = await extract({ data: { ...payload, lang } });
      if ("error" in r && r.error) throw new Error(r.error);
      const out = (r as { data: { title: string; subject: string; questions: Omit<Deck["questions"][number], "id" | "ai_answer">[] & { answer_from_sheet: boolean }[] } }).data;
      if (!out.questions.length) throw new Error("No questions found in this file.");
      setDraft({
        id: uid(),
        title: out.title || name,
        subject: out.subject || "General",
        createdAt: Date.now(),
        scores: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: out.questions.map((q: any) => ({
          id: uid(),
          question: q.question,
          type: q.type,
          options: q.options ?? [],
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          topic: q.topic,
          difficulty: q.difficulty,
          ai_answer: !q.answer_from_sheet,
        })),
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (f: File) => {
    const name = f.name.replace(/\.[^.]+$/, "");
    const ext = f.name.split(".").pop()?.toLowerCase();
    try {
      if (f.type.startsWith("image/")) {
        const url = await shrinkImage((await readAs(f, "dataURL")) as string);
        return run({ kind: "image", dataUrl: url }, name);
      }
      if (ext === "pdf") {
        const url = (await readAs(f, "dataURL")) as string;
        return run({ kind: "pdf", base64: url.split(",")[1], filename: f.name }, name);
      }
      if (ext === "docx") {
        const mammoth = await import("mammoth");
        const buf = (await readAs(f, "buffer")) as ArrayBuffer;
        const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
        return run({ kind: "text", text: value }, name);
      }
      const txt = (await readAs(f, "text")) as string;
      return run({ kind: "text", text: txt }, name);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (busy)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="grid size-24 place-items-center rounded-3xl bg-ember text-primary-foreground shadow-glow">
          <Hammer className="size-10 animate-forge" />
        </div>
        <p className="font-display text-2xl font-bold">{t.extracting}</p>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-ember" />
        </div>
      </div>
    );

  if (draft)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">{t.reviewTitle}</h1>
          <Button variant="ghost" onClick={() => setDraft(null)}>✕</Button>
        </div>
        <DeckEditor
          initial={draft}
          onSave={(d) => {
            addDeck(d);
            setDraft(null);
            nav({ to: "/" });
          }}
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-3xl font-bold">{t.newDeck}</h1>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inp.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition-all ${drag ? "scale-[1.02] border-primary bg-accent" : "bg-card hover:border-primary/60"}`}
      >
        <div className="grid size-16 place-items-center rounded-2xl bg-ember text-primary-foreground shadow-glow">
          <FileUp className="size-7" />
        </div>
        <p className="font-display text-xl font-bold">{t.dropTitle}</p>
        <p className="text-sm text-muted-foreground">{t.dropHint}</p>
        <Button variant="outline" size="sm">{t.browse}</Button>
        <input
          ref={inp}
          type="file"
          hidden
          accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{t.orPaste}</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-32" placeholder="1. What is the powerhouse of the cell? a) Nucleus b) Mitochondria …" />
        <Button variant="hero" className="w-full" disabled={!text.trim()} onClick={() => run({ kind: "text", text }, "Pasted sheet")}>
          {t.extract}
        </Button>
      </div>
    </div>
  );
}
