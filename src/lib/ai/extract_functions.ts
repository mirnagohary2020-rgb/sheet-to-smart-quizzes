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

const INSTRUCTIONS = `You extract quiz questions from practice sheets (any language, including Arabic).
Split the content into individual questions. For each question:
- type: "mcq" (has lettered/numbered choices), "true_false", "short_answer", or "fill_blank" (contains a blank like ____).
- options: the choice texts WITHOUT their letter prefixes. For true_false use ["True","False"] (or Arabic equivalents if the sheet is Arabic). Empty array for short_answer/fill_blank.
- correct_answer: for mcq/true_false, EXACTLY the text of the correct option. For others, the concise answer.
- If the sheet contains an answer key, use it and set answer_from_sheet=true. Otherwise solve it yourself and set answer_from_sheet=false.
- explanation: 1-2 short sentences.
- topic: short topic label. difficulty: easy/medium/hard.
Also give the sheet a short title and a one-word subject (e.g. Biology, Chemistry, Physics, Math, History).
Keep the question wording faithful to the sheet. Ignore headers, page numbers and instructions that are not questions.`;

export const extractQuestions = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => input)
  .handler(async ({ data }) => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { generateText, Output, NoObjectGeneratedError } = await import("ai");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "AI is not configured." };

    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: "Extract all questions from this practice sheet." },
    ];
    if (data.kind === "text") {
      content.push({ type: "text", text: (data.text ?? "").slice(0, 120_000) });
    } else if (data.kind === "image" && data.dataUrl) {
      content.push({ type: "image", image: new URL(data.dataUrl) });
    } else if (data.kind === "pdf" && data.base64) {
      content.push({
        type: "file",
        filename: data.filename ?? "sheet.pdf",
        data: data.base64,
        mediaType: "application/pdf",
      });
    } else {
      return { error: "Empty upload." };
    }

    try {
      const result = await generateText({
        model: provider.responses("openai/gpt-6-astra"),
        system: INSTRUCTIONS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: content as any }],
        output: Output.object({ schema: QSchema }),
        maxRetries: 1,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      return { data: await result.output };
    } catch (e: unknown) {
      if (NoObjectGeneratedError.isInstance(e)) {
        return { error: "The AI could not read questions from this file. Try a clearer scan." };
      }
      // RetryError wraps the real API error in lastError
      const outer = e as { lastError?: unknown; cause?: unknown };
      const err = (outer.lastError ?? outer.cause ?? e) as {
        statusCode?: number;
        message?: string;
        responseBody?: string;
      };
      console.error("extractQuestions failed:", err.statusCode, err.message, err.responseBody);
      if (err.statusCode === 402) return { error: "AI credits are used up. Add credits to continue." };
      if (err.statusCode === 429) return { error: "Too many requests — please wait a moment and retry." };
      if (err.statusCode === 413) return { error: "File is too large. Try a smaller file or fewer pages." };
      if (err.statusCode === 400 || err.statusCode === 404)
        return { error: `AI request rejected (${err.statusCode}): ${err.message ?? "bad request"}` };
      return { error: err.message ?? "Extraction failed." };
    }
  });
