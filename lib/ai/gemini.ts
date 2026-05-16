import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { env } from "@/lib/env";
import { AIError, type QuizResponse, QuizResponseSchema } from "./schemas";

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return _client;
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

/**
 * Generate quiz questions using Gemini 2.5 Flash.
 * Returns structured JSON validated by Zod.
 */
export async function geminiGenerateQuiz(
  systemPrompt: string,
  userPrompt: string
): Promise<QuizResponse> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.4, // Lower for factual quiz generation
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json", // Force JSON mode
    },
  });

  const prompt = `${systemPrompt}\n\n${userPrompt}`;

  let response;
  try {
    response = await model.generateContent(prompt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Gemini error";
    const isRetryable = msg.includes("503") || msg.includes("overloaded") || msg.includes("RESOURCE_EXHAUSTED");
    throw new AIError(msg, "gemini", "GENERATION_FAILED", isRetryable);
  }

  const text = response.response.text().trim();

  // Strip markdown fences if Gemini adds them despite JSON mode
  const clean = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new AIError(
      `Gemini returned invalid JSON: ${clean.slice(0, 200)}`,
      "gemini",
      "INVALID_JSON",
      false
    );
  }

  const result = QuizResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new AIError(
      `Gemini response failed schema validation: ${JSON.stringify(result.error.flatten())}`,
      "gemini",
      "SCHEMA_VALIDATION_FAILED",
      false
    );
  }

  return result.data;
}

/**
 * Stream tutor response from Gemini.
 */
export async function geminiStreamTutor(
  systemPrompt: string,
  messages: Array<{ role: "user" | "model"; parts: [{ text: string }] }>
): Promise<ReadableStream<string>> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    systemInstruction: systemPrompt,
  });

  let streamResult;
  try {
    streamResult = await model.generateContentStream({ contents: messages });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Gemini error";
    throw new AIError(msg, "gemini", "STREAM_FAILED", true);
  }

  return new ReadableStream<string>({
    async pull(controller) {
      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) controller.enqueue(text);
      }
      controller.close();
    },
  });
}

/**
 * Generate text embeddings using Gemini embedding model.
 * Returns 768-dimensional vector.
 */
export async function geminiEmbed(text: string): Promise<number[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-embedding-001" });

  let result;
  try {
    result = await model.embedContent(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Gemini error";
    throw new AIError(msg, "gemini", "EMBEDDING_FAILED", true);
  }

  const { values } = result.embedding;
  if (!values || values.length === 0) {
    throw new AIError("Gemini returned empty embedding", "gemini", "EMPTY_EMBEDDING", false);
  }

  return values;
}

/**
 * Simple text generation (non-streaming) for internal use.
 */
export async function geminiGenerate(prompt: string, temperature = 0.7): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: { temperature, maxOutputTokens: 2048 },
  });

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Gemini error";
    throw new AIError(msg, "gemini", "GENERATION_FAILED", true);
  }
}
