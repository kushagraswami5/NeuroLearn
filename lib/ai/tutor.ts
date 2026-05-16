/**
 * NeuroLearn AI Tutor Module
 *
 * Handles: context retrieval → prompt assembly → streaming
 */

import { generateTutorReply, createEmbedding } from "./provider";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "./cache";
import type { TutorRequest } from "./schemas";

const TUTOR_RATE_LIMIT = { maxRequests: 20, windowSeconds: 60 };

// ─── RAG Retrieval ──────────────────────────────────────────────────────────────

interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  fileId: string;
  filename: string;
}

/**
 * Find semantically similar chunks from user's uploaded files.
 * Uses pgvector cosine similarity search via raw SQL (Prisma doesn't support vector ops natively).
 */
export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  limit = 5
): Promise<RetrievedChunk[]> {
  const embeddingResult = await createEmbedding(query);
  const embedding = embeddingResult.data;

  // Format as postgres vector literal
  const vectorStr = `[${embedding.join(",")}]`;

  // pgvector cosine similarity: 1 - (a <=> b)
  // Join with UploadedFile to ensure ownership
  const chunks = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      similarity: number;
      fileId: string;
      filename: string;
    }>
  >`
    SELECT
      ce.id,
      ce.content,
      1 - (ce.embedding <=> ${vectorStr}::vector) AS similarity,
      ce."fileId",
      uf.filename
    FROM "ChunkEmbedding" ce
    JOIN "UploadedFile" uf ON uf.id = ce."fileId"
    WHERE uf."userId" = ${userId}
      AND uf.status = 'READY'
      AND ce.embedding IS NOT NULL
    ORDER BY ce.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  // Filter out low-similarity results (below 0.6 cosine similarity)
  return chunks.filter((c) => c.similarity > 0.6);
}

/**
 * Format retrieved chunks into context string for the tutor prompt.
 */
export function formatRAGContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const formatted = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1} — ${c.filename} (${Math.round(c.similarity * 100)}% match)]\n${c.content}`
    )
    .join("\n\n---\n\n");

  return formatted;
}

// ─── Tutor Stream ───────────────────────────────────────────────────────────────

export async function streamTutorResponse(params: {
  userId: string;
  messages: TutorRequest["messages"];
  subjectName?: string;
  useRAG?: boolean;
}): Promise<{
  stream: ReadableStream<string>;
  citations: RetrievedChunk[];
}> {
  const { userId, messages, subjectName, useRAG = true } = params;

  // Rate limit
  const rateCheck = await checkRateLimit(
    `tutor:${userId}`,
    TUTOR_RATE_LIMIT.maxRequests,
    TUTOR_RATE_LIMIT.windowSeconds
  );

  if (!rateCheck.allowed) {
    throw new Error("Too many tutor requests. Please wait a moment.");
  }

  // Retrieve RAG context from user's notes
  let citations: RetrievedChunk[] = [];
  let context: string | undefined;

  if (useRAG && messages.length > 0) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      try {
        citations = await retrieveRelevantChunks(lastUserMessage.content, userId);
        if (citations.length > 0) {
          context = formatRAGContext(citations);
        }
      } catch (err) {
        // RAG failure is non-fatal — tutor works without context
        console.warn("[Tutor RAG] Retrieval failed:", err);
      }
    }
  }

  const stream = await generateTutorReply({
    userId,
    messages,
    context,
    subjectName,
  });

  return { stream, citations };
}
