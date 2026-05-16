/**

NeuroLearn Embeddings Module
*/

import { createEmbedding } from "./provider";
import { chunkText } from "./quiz";
import { prisma } from "@/lib/db";

interface EmbedDocumentResult {
chunksCreated: number;
chunksSkipped: number;
errors: string[];
}

export async function embedDocument(
fileId: string,
text: string
): Promise<EmbedDocumentResult>{
console.log("[Embeddings] Starting document embedding");
console.log("[Embeddings] Text length:", text.length);

// Smaller chunks = lower memory usage
const chunks = chunkText(text, 1800, 200);

console.log("[Embeddings] Total chunks:", chunks.length);

let chunksCreated = 0;
let chunksSkipped = 0;

const errors: string[] = [];

// Sequential processing prevents memory spikes
for (const chunk of chunks) {
try {
if (!chunk.text || chunk.text.trim().length < 50) {
chunksSkipped++;
continue;
}

  console.log(
    `[Embeddings] Processing chunk ${chunk.index}`
  );

  // Generate embedding
  const result = await createEmbedding(chunk.text);

  const embedding = result.data;

  if (!embedding || embedding.length === 0) {
    throw new Error("Empty embedding returned");
  }

  // Store directly
  await prisma.$executeRaw`
    INSERT INTO "ChunkEmbedding"
    (
      id,
      "fileId",
      "chunkIndex",
      content,
      embedding,
      "tokenCount",
      "createdAt"
    )
    VALUES
    (
      gen_random_uuid(),
      ${fileId}::text,
      ${chunk.index}::integer,
      ${chunk.text}::text,
      ${JSON.stringify(embedding)}::vector,
      ${chunk.tokenEstimate}::integer,
      NOW()
    )
    ON CONFLICT DO NOTHING
  `;

  chunksCreated++;

  console.log(
    `[Embeddings] Chunk ${chunk.index} saved`
  );

  // tiny delay to reduce API pressure
  await new Promise((resolve) =>
    setTimeout(resolve, 100)
  );
} catch (err) {
  const msg =
    err instanceof Error
      ? err.message
      : "Unknown embedding error";

  console.error(
    `[Embeddings] Chunk ${chunk.index} failed:`,
    msg
  );

  errors.push(`Chunk ${chunk.index}: ${msg}`);

  chunksSkipped++;
}

}

console.log("[Embeddings] Finished processing");

await prisma.uploadedFile.update({
where: { id: fileId },
data: {
status:
chunksCreated > 0 ? "READY" : "FAILED",
chunkCount: chunksCreated,
processedAt: new Date(),
errorMsg:
errors.length > 0
? errors.slice(0, 3).join("; ")
: null,
},
});

return {
chunksCreated,
chunksSkipped,
errors,
};
}

export async function deleteDocumentEmbeddings(
fileId: string
): Promise <void> {
await prisma.chunkEmbedding.deleteMany({
where: { fileId },
});
}