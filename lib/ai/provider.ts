/**
 * NeuroLearn AI Provider
 *
 * ALL AI calls in the app MUST go through this module.
 * Never import gemini.ts or groq.ts directly in app code.
 *
 * Architecture:
 *   Primary: Gemini 2.5 Flash
 *   Fallback: Groq LLaMA 3.3 70B
 *   Cache: Upstash Redis
 *   Retry: Exponential backoff
 */

import { PROMPTS } from "./prompts";
import { geminiGenerateQuiz, geminiStreamTutor, geminiEmbed } from "./gemini";
import { groqGenerateQuiz, groqStreamTutor } from "./groq";
import { withFallback, sanitizeAIOutput, truncateToTokenBudget } from "./fallback";
import { getCached, setCached, makeCacheKey } from "./cache";
import type { AIResult, QuizResponse, TutorRequest } from "./schemas";

// ─── Quiz Generation ────────────────────────────────────────────────────────────

export async function generateQuiz(params: {
  text: string;
  questionCount: number;
  subjectName?: string;
  userId: string;
  forceRefresh?: boolean;
}): Promise<AIResult<QuizResponse>> {
  const { text, questionCount, subjectName, userId, forceRefresh } = params;

  // Truncate input to avoid token explosion (Gemini 2.5 Flash: 1M context but we cap at 12k for cost)
  const safeText = truncateToTokenBudget(text, 3000);

  const cacheKey = makeCacheKey("quiz", userId, safeText, String(questionCount));

  if (!forceRefresh) {
    const cached = await getCached<QuizResponse>(cacheKey);
    if (cached) {
      return {
        data: cached,
        provider: "gemini",
        model: "gemini-2.5-flash",
        usedFallback: false,
        latencyMs: 0,
        cached: true,
      };
    }
  }

  const systemPrompt = PROMPTS.quizSystem;
  const userPrompt = PROMPTS.quizUser(safeText, questionCount, subjectName);

  const start = Date.now();
  const { result, usedFallback } = await withFallback(
    () => geminiGenerateQuiz(systemPrompt, userPrompt),
    () => groqGenerateQuiz(systemPrompt, userPrompt)
  );
  const latencyMs = Date.now() - start;

  // Post-processing: filter hallucinations (questions with no grounding in source)
  const filtered = filterHallucinations(result, safeText);

  await setCached(cacheKey, filtered, "quiz");

  return {
    data: filtered,
    provider: usedFallback ? "groq" : "gemini",
    model: usedFallback ? "llama-3.3-70b-versatile" : "gemini-2.5-flash",
    usedFallback,
    latencyMs,
    cached: false,
  };
}

// Simple hallucination filter: remove questions where no keyword from question
// appears in the source text (indicates AI fabrication)
function filterHallucinations(quiz: QuizResponse, sourceText: string): QuizResponse {
  const sourceLower = sourceText.toLowerCase();
  const filtered = quiz.questions.filter((q) => {
    // Extract significant words (>4 chars) from question
    const words = q.question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4 && /^[a-z]+$/.test(w));

    if (words.length === 0) return true; // Keep if no extractable words

    // At least 1 significant word must appear in source
    return words.some((word) => sourceLower.includes(word));
  });

  return {
    ...quiz,
    questions: filtered,
    totalGenerated: filtered.length,
  };
}

// ─── AI Tutor ───────────────────────────────────────────────────────────────────

export async function generateTutorReply(
  request: TutorRequest & { userId: string }
): Promise<ReadableStream<string>> {
  const { messages, context, subjectName } = request;

  const systemPrompt = PROMPTS.tutorSystem(subjectName, context);

  // Convert to Gemini format and try streaming
  const geminiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: sanitizeAIOutput(m.content) }],
  }));

  const groqMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: sanitizeAIOutput(m.content),
  }));

  try {
    return await geminiStreamTutor(systemPrompt, geminiMessages);
  } catch (err) {
    console.warn("[Tutor] Gemini stream failed, falling back to Groq:", err);
    return await groqStreamTutor(systemPrompt, groqMessages);
  }
}

// ─── Embeddings ─────────────────────────────────────────────────────────────────

export async function createEmbedding(text: string): Promise<AIResult<number[]>> {
  // Only Gemini supports embeddings — no Groq fallback here
  const cacheKey = makeCacheKey("embedding", text);

  const cached = await getCached<number[]>(cacheKey);
  if (cached) {
    return {
      data: cached,
      provider: "gemini",
      model: "text-embedding-004",
      usedFallback: false,
      latencyMs: 0,
      cached: true,
    };
  }

  const start = Date.now();
  const embedding = await geminiEmbed(text);
  const latencyMs = Date.now() - start;

  await setCached(cacheKey, embedding, "embedding");

  return {
    data: embedding,
    provider: "gemini",
    model: "text-embedding-004",
    usedFallback: false,
    latencyMs,
    cached: false,
  };
}

// ─── Card Generation ────────────────────────────────────────────────────────────

export async function generateCards(params: {
  text: string;
  count: number;
  userId: string;
}): Promise<Array<{ front: string; back: string; hint?: string }>> {
  const { text, count, userId } = params;
  const safeText = truncateToTokenBudget(text, 2000);

  const systemPrompt = PROMPTS.cardGenerationSystem;
  const userPrompt = PROMPTS.cardGenerationUser(safeText, count);

  const cacheKey = makeCacheKey("cards", userId, safeText, String(count));
  const cached = await getCached<Array<{ front: string; back: string; hint?: string }>>(cacheKey);
  if (cached) return cached;

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  // Try Gemini first with JSON mode
  let raw: string;
  try {
    const { geminiGenerate } = await import("./gemini");
    raw = await geminiGenerate(fullPrompt, 0.5);
  } catch {
    const { groqGenerate } = await import("./groq");
    raw = await groqGenerate(fullPrompt, 0.5);
  }

  const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(clean) as { cards: Array<{ front: string; back: string; hint?: string }> };
    const cards = parsed.cards?.slice(0, count) ?? [];
    await setCached(cacheKey, cards, "quiz");
    return cards;
  } catch {
    return [];
  }
}
