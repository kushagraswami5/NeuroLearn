-- NeuroLearn: Enable pgvector + HNSW index for semantic search
-- Run after: prisma migrate dev

-- Enable pgvector extension (if not already done by Prisma)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

-- HNSW index for fast approximate nearest-neighbor search
-- m=16, ef_construction=64 is a good balance for <1M vectors
CREATE INDEX IF NOT EXISTS "ChunkEmbedding_embedding_hnsw_idx"
ON "ChunkEmbedding"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Composite index for per-user similarity search
CREATE INDEX IF NOT EXISTS "ChunkEmbedding_file_chunk_idx"
ON "ChunkEmbedding" ("fileId", "chunkIndex");
