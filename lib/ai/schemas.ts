import { z } from "zod";

// ─── Provider Types ────────────────────────────────────────────────────────────

export type AIProvider = "gemini" | "groq";

export interface AIProviderConfig {
  name: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  gemini: {
    name: "gemini",
    model: "gemini-2.5-flash",
    maxTokens: 8192,
    temperature: 0.7,
  },
  groq: {
    name: "groq",
    model: "llama-3.3-70b-versatile",
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// ─── Quiz Schemas ──────────────────────────────────────────────────────────────

export const QuizOptionSchema = z.object({
  id: z.string().length(1), // "A", "B", "C", "D"
  text: z.string().min(1).max(500),
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(10).max(1000),
  options: z.array(QuizOptionSchema).length(4),
  correctId: z.string().length(1),
  explanation: z.string().min(10).max(1000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().optional(),
});

export const QuizResponseSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1).max(30),
  totalGenerated: z.number(),
  sourceChunks: z.number().optional(),
});

export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizResponse = z.infer<typeof QuizResponseSchema>;

// ─── Tutor Schemas ─────────────────────────────────────────────────────────────

export const TutorRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000),
    })
  ).max(20),
  context: z.string().max(8000).optional(), // RAG context
  subjectName: z.string().optional(),
});

export type TutorRequest = z.infer<typeof TutorRequestSchema>;

// ─── Embedding Schemas ─────────────────────────────────────────────────────────

export const EmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()).length(768),
  model: z.string(),
  tokens: z.number(),
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

// ─── Generic AI Result ─────────────────────────────────────────────────────────

export interface AIResult<T> {
  data: T;
  provider: AIProvider;
  model: string;
  usedFallback: boolean;
  latencyMs: number;
  cached: boolean;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AIError";
  }
}
