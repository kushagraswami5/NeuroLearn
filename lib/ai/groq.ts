import Groq from "groq-sdk";
import { env } from "@/lib/env";
import { AIError, type QuizResponse, QuizResponseSchema } from "./schemas";

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return _client;
}

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant"; // Even faster fallback

/**
 * Generate quiz questions using Groq (LLaMA 3.3 70B).
 * Used as fallback when Gemini fails.
 */
export async function groqGenerateQuiz(
  systemPrompt: string,
  userPrompt: string
): Promise<QuizResponse> {
  const client = getClient();

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
      response_format: { type: "json_object" }, // Groq JSON mode
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Groq error";
    const isRetryable = msg.includes("rate_limit") || msg.includes("503");

    // Try smaller model on overload
    if (isRetryable) {
      try {
        completion = await client.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        });
      } catch (innerErr: unknown) {
        const innerMsg = innerErr instanceof Error ? innerErr.message : "Unknown error";
        throw new AIError(innerMsg, "groq", "BOTH_MODELS_FAILED", false);
      }
    } else {
      throw new AIError(msg, "groq", "GENERATION_FAILED", false);
    }
  }

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new AIError("Groq returned empty response", "groq", "EMPTY_RESPONSE", false);
  }

  const clean = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new AIError(
      `Groq returned invalid JSON: ${clean.slice(0, 200)}`,
      "groq",
      "INVALID_JSON",
      false
    );
  }

  const result = QuizResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new AIError(
      `Groq response failed schema validation: ${JSON.stringify(result.error.flatten())}`,
      "groq",
      "SCHEMA_VALIDATION_FAILED",
      false
    );
  }

  return result.data;
}

/**
 * Stream tutor response from Groq (very fast, good for real-time chat).
 */
export async function groqStreamTutor(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ReadableStream<string>> {
  const client = getClient();

  let stream;
  try {
    stream = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Groq error";
    throw new AIError(msg, "groq", "STREAM_FAILED", true);
  }

  return new ReadableStream<string>({
    async pull(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) controller.enqueue(text);
      }
      controller.close();
    },
  });
}

/**
 * Groq text embedding — Groq doesn't support embeddings natively.
 * This throws to force fallback to Gemini.
 */
export async function groqEmbed(_text: string): Promise<number[]> {
  throw new AIError(
    "Groq does not support embeddings — use Gemini",
    "groq",
    "UNSUPPORTED",
    false
  );
}

/**
 * Simple text completion via Groq.
 */
export async function groqGenerate(
  prompt: string,
  temperature = 0.7
): Promise<string> {
  const client = getClient();
  try {
    const completion = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 2048,
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Groq error";
    throw new AIError(msg, "groq", "GENERATION_FAILED", true);
  }
}
