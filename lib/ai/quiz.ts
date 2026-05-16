/**

NeuroLearn Quiz AI Module


Orchestrates:
PDF text extraction → chunking → quiz generation → validation
*/

import { generateQuiz } from "./provider";
import { checkRateLimit } from "./cache";
import type { QuizResponse } from "./schemas";
import { extractText } from "unpdf";

// ─── Text Chunking ──────────────────────────────────────────────────────────────

interface TextChunk {
index: number;
text: string;
tokenEstimate: number;
}

/**

Split text into overlapping chunks for better context coverage.
*/
export function chunkText(
text: string,
chunkSize = 2048,
overlapSize = 256
): TextChunk[] {
const chunks: TextChunk[] = [];

let start = 0;
let index = 0;

// Prevent runaway chunk generation
const MAX_CHUNKS = 500;

// Clean the text first
const cleaned = text
.replace(/\r\n/g, "\n")
.replace(/\n{3,}/g, "\n\n")
.replace(/\s{3,}/g, " ")
.trim();

if (cleaned.length === 0) {
return [];
}

while (start < cleaned.length) {
// Safety guard
if (chunks.length >= MAX_CHUNKS) {
console.warn("[Chunking] Max chunk limit reached");
break;
}

const end = Math.min(start + chunkSize, cleaned.length);

const chunk = cleaned.slice(start, end);

// Try to break at sentence boundary
const lastPeriod = chunk.lastIndexOf(".");
const lastNewline = chunk.lastIndexOf("\n");

const breakPoint = Math.max(lastPeriod, lastNewline);

const finalChunk =
  end < cleaned.length && breakPoint > chunkSize * 0.6
    ? chunk.slice(0, breakPoint + 1)
    : chunk;

const trimmedChunk = finalChunk.trim();

// Skip empty chunks
if (trimmedChunk.length === 0) {
  break;
}

chunks.push({
  index,
  text: trimmedChunk,
  tokenEstimate: Math.ceil(trimmedChunk.length / 4),
});

// CRITICAL FIX:
// Prevent infinite loop if overlap is too large
const step = Math.max(
  finalChunk.length - overlapSize,
  chunkSize - overlapSize  // minimum meaningful advance
);

start += step;

index++;

}

console.log(
"[Chunking] Created chunks:",
chunks.length
);

return chunks;
}

/**

Select the most information-dense chunks for quiz generation.
*/
export function selectBestChunks(
chunks: TextChunk[],
maxTokens = 3000
): string {
if (chunks.length === 0) {
return "";
}

// Score each chunk
const scored = chunks.map((chunk) => {
const sentences = chunk.text
.split(/[.!?]+/)
.filter((s) => s.trim().length > 10);

const words = new Set(
  chunk.text.toLowerCase().split(/\s+/)
);

const score =
  sentences.length * 2 + words.size;

return {
  chunk,
  score,
};

});

scored.sort((a, b) => b.score - a.score);

let totalTokens = 0;

const selected: string[] = [];

for (const { chunk } of scored) {
if (
totalTokens + chunk.tokenEstimate >
maxTokens
) {
break;
}

selected.push(chunk.text);

totalTokens += chunk.tokenEstimate;

}

return selected.join("\n\n---\n\n");
}

// ─── Rate-Limited Quiz Generation ──────────────────────────────────────────────

const QUIZ_RATE_LIMIT = {
maxRequests: 5,
windowSeconds: 60,
};

export async function generateQuizFromText(params: {
text: string;
questionCount: number;
subjectName?: string;
userId: string;
forceRefresh?: boolean;
}): Promise<QuizResponse> {
// Rate limit
const rateCheck = await checkRateLimit(
`quiz:${params.userId}`,
QUIZ_RATE_LIMIT.maxRequests,
QUIZ_RATE_LIMIT.windowSeconds
);

if (!rateCheck.allowed) {
const secondsRemaining = Math.ceil(
rateCheck.resetAt - Date.now() / 1000
);

throw new Error(
  `Rate limit exceeded. Try again in ${secondsRemaining}s`
);
}

// Chunk + select best content
const chunks = chunkText(params.text);

const selectedText = selectBestChunks(
chunks,
3000
);

const result = await generateQuiz({
...params,
text: selectedText,
});

return result.data;
}


// ─── PDF Text Extraction ────────────────────────────────────────────────────────

/**

Extract text from PDF buffer using pdf-parse.
*/
export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  pages: number;
  error?: string;
}> {
  try {
    const { text, totalPages } = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });

    const cleaned = text
      .replace(/\x00/g, "")
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ")
      .trim();

    return { text: cleaned, pages: totalPages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF parse failed";
    console.error("[PDF Extract] Failed:", msg);
    return { text: "", pages: 0, error: msg };
  }
}

/**

Validate extracted text quality.
*/
export function validateExtractedText(
text: string
): {
valid: boolean;
reason?: string;
} {
if (text.length < 100) {
return {
valid: false,
reason:
"Too little text extracted",
};
}

const readableChars = text.replace(
/[^a-zA-Z\s]/g,
""
).length;

const ratio = readableChars / text.length;

if (ratio < 0.5) {
return {
valid: false,
reason:
"Too many non-text characters",
};
}

return {
valid: true,
};
}