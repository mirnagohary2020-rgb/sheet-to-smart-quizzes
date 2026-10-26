import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Input = {
  kind: "text" | "image" | "pdf";
  text?: string;
  dataUrl?: string; // image data URL
  base64?: string; // pdf base64
  filename?: string;
  lang?: "en" | "ar";
};

const QSchema = z.object({
  title: z.string(),
  subject: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(["mcq", "true_false", "short_answer", "fill_blank"]),
      options: z.array(z.string()),
      correct_answer: z.string(),
      explanation: z.string(),
      topic: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      answer_from_sheet: z.boolean(),
    }),
  ),
});

const JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subject: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          type: { type: "string", enum: ["mcq", "true_false", "short_answer", "fill_blank"] },
          options: { type: "array", items: { type: "string" } },
          correct_answer: { type: "string" },
          explanation: { type: "string" },
          topic: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          answer_from_sheet: { type: "boolean" },
        },
        required: [
          "question", "type", "options", "correct_answer",
          "explanation", "topic", "difficulty", "answer_from_sheet",
        ],
      },
    },
  },
  required: ["title", "subject", "questions"],
};

const INSTRUCTIONS = `You extract quiz questions from practice sheets (any language, including Arabic).
Split the content into individual questions. For each question:
- type: "mcq" (has lettered/numbered choices), "true_false", "short_answer", or "fill_blank" (contains a blank like ____).
- options: the choice texts WITHOUT their letter prefixes. For true_false use ["True","False"] (or Arabic equivalents if the sheet is Arabic). Empty array for short_answer/fill_blank.
- correct_answer: for mcq/true_false, EXACTLY the text of the correct option. For others, the concise answer.
- If the sheet contains an answer key, use it and set answer_from_sheet=true. Otherwise solve it yourself and set answer_from_sheet=false.
- explanation: 1-2 short sentences.
- topic: short topic label. difficulty: easy/medium/hard.
Also give the sheet a short title and a one-word subject (e.g. Biology, Chemistry, Physics, Math, History).
Keep the question wording faithful to the sheet. Ignore headers, page numbers and instructions that are not questions.
Return the result by calling the save_quiz tool.`;

const MODEL = "claude-haiku-5-5";

export const extractQuestions = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) return { error: "AI is not configured (missing ANTHROPIC_API_KEY)." };

    const content: Array<Record<string, unknown>> = [];
    if (data.kind === "text" && data.text?.trim()) {
      content.push({ type: "text", text: data.text.slice(0, 120_000) });
    } else if (data.kind === "image" && data.dataUrl) {
      const m = data.dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
      if (!m) return { error: "Unsupported image format." };
      const mediaType = m[1].toLowerCase() === "image/jpg" ? "image/jpeg" : m[1].toLowerCase();
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: m[2] } });
    } else if (data.kind === "pdf" && data.base64) {
      const b64 = data.base64.replace(/^data:[^,]+,/, "");
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: b64 },
      });
    } else {
      return { error: "Empty upload." };
    }
    content.push({ type: "text", text: "Extract all questions from this practice sheet." });

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          system: INSTRUCTIONS,
          tools: [{ name: "save_quiz", description: "Save the extracted quiz.", input_schema: JSON_SCHEMA }],
          tool_choice: { type: "tool", name: "save_quiz" },
          messages: [{ role: "user", content }],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Anthropic error:", res.status, body);
        if (res.status === 401) return { error: "Invalid Anthropic API key." };
        if (res.status === 402 || /credit balance/i.test(body))
          return { error: "Anthropic credits are used up. Add credits in the Anthropic Console." };
        if (res.status === 413) return { error: "File is too large. Try a smaller file or fewer pages." };
        if (res.status === 429) return { error: "Too many requests — please wait a moment and retry." };
        if (res.status === 529 || res.status >= 500) return { error: "AI service is busy. Please retry shortly." };
        let msg = body;
        try { msg = JSON.parse(body)?.error?.message ?? body; } catch { /* keep raw */ }
        return { error: `AI request rejected (${res.status}): ${msg}` };
      }

      const json = (await res.json()) as {
        stop_reason?: string;
        content?: Array<{ type: string; input?: unknown }>;
      };
      if (json.stop_reason === "max_tokens")
        return { error: "Sheet is too long to extract at once. Split it into smaller files." };

      const tool = json.content?.find((c) => c.type === "tool_use");
      const parsed = QSchema.safeParse(tool?.input);
      if (!parsed.success) {
        console.error("Schema mismatch:", parsed.error?.issues);
        return { error: "The AI could not read questions from this file. Try a clearer scan." };
      }
      return { data: parsed.data };
    } catch (e: unknown) {
      console.error(e);
      return { error: (e as Error)?.message ?? "Extraction failed." };
    }
  });
