# NeuroLearn

**AI-powered adaptive learning platform** built with Next.js 15, Gemini 2.5 Flash, and spaced repetition.

[![CI](https://github.com/your-org/neurolearn/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/neurolearn/actions)

---

## Features

| Feature | Description |
|---|---|
| 🧠 AI Quiz Generation | Upload PDFs/notes → Gemini generates grounded multiple-choice questions |
| 🎯 SM-2 Spaced Repetition | Battle-tested algorithm schedules reviews at the optimal time |
| 💬 RAG Tutor Chat | Ask questions — answers grounded in your uploaded notes via pgvector |
| 📊 Learning Analytics | Streak tracking, mastery scores, exam readiness, weak-subject detection |
| ⚡ Emergency Revision | Timed mode that surfaces weakest cards first for last-minute cramming |
| 📁 File Management | PDF/TXT/MD upload, embedding, and quiz generation |
| 🔐 Auth | Google OAuth + Magic Link via Auth.js v5 |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| AI (Primary) | Google Gemini 2.5 Flash |
| AI (Fallback) | Groq LLaMA 3.3 70B |
| Database | Neon PostgreSQL + Prisma |
| Vector Search | pgvector + HNSW index |
| Cache/Rate Limit | Upstash Redis |
| File Storage | Vercel Blob |
| Auth | Auth.js v5 (Google OAuth + Resend magic link) |
| Monitoring | Sentry + PostHog |
| CI | GitHub Actions |
| Tests | Vitest (unit) + Playwright (e2e) |

---

## Architecture

```
neurolearn/
├── app/
│   ├── (dashboard)/         # Authenticated routes
│   │   ├── dashboard/       # Overview & stats
│   │   ├── subjects/        # Subject + topic management
│   │   ├── revision/        # SM-2 flashcard review
│   │   ├── quiz/            # AI quiz generator
│   │   ├── tutor/           # RAG-powered AI tutor chat
│   │   ├── analytics/       # Learning analytics
│   │   ├── files/           # PDF upload & management
│   │   └── settings/        # User account settings
│   ├── api/
│   │   ├── auth/            # Auth.js route handler
│   │   ├── quiz/generate/   # Quiz generation (streaming-safe)
│   │   ├── tutor/stream/    # SSE streaming for tutor
│   │   └── upload/          # File upload + processing
│   └── actions/             # Server Actions (mutations)
├── lib/
│   ├── ai/
│   │   ├── provider.ts      # PUBLIC API: generateQuiz, generateTutorReply, createEmbedding
│   │   ├── gemini.ts        # Gemini 2.5 Flash implementation
│   │   ├── groq.ts          # Groq LLaMA fallback
│   │   ├── fallback.ts      # Retry + fallback orchestration
│   │   ├── cache.ts         # Redis caching + rate limiting
│   │   ├── prompts.ts       # All prompt templates (centralised)
│   │   ├── quiz.ts          # PDF extraction + chunking + quiz orchestration
│   │   ├── tutor.ts         # RAG retrieval + tutor streaming
│   │   ├── embeddings.ts    # Document embedding pipeline
│   │   └── schemas.ts       # Zod schemas for all AI I/O
│   ├── sm2.ts               # SM-2 spaced repetition algorithm
│   ├── dal.ts               # Data Access Layer (all DB queries)
│   ├── auth.ts              # Auth.js config
│   ├── db.ts                # Prisma singleton
│   └── env.ts               # Zod-validated environment
└── components/              # React components (organised by feature)
```

### Key Architecture Decisions

- **Server Components by default** — data fetching happens on the server
- **Server Actions for mutations** — no API routes for CRUD
- **Route Handlers only for** AI streaming and file uploads
- **DAL enforces ownership** — every query is scoped to `userId`
- **AI calls always through `provider.ts`** — never direct SDK calls in app code
- **Gemini → Groq fallback** with exponential backoff retry
- **Redis caching** for quiz questions (24h TTL) and embeddings (7d TTL)
- **pgvector HNSW index** for sub-100ms similarity search

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (with pgvector extension enabled)
- [Upstash Redis](https://upstash.com) database
- [Google AI Studio](https://aistudio.google.com) API key (Gemini)
- [Groq](https://console.groq.com) API key
- Google OAuth app credentials
- [Resend](https://resend.com) API key (magic link email)
- [Vercel](https://vercel.com) account (for Blob storage)

### 1. Clone & install

```bash
git clone https://github.com/your-org/neurolearn.git
cd neurolearn
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Set up database

```bash
# Push schema to Neon
npm run db:push

# Run the HNSW vector index migration
npx prisma migrate deploy

# (Optional) Seed with demo data
npm run db:seed
```

### 4. Enable pgvector on Neon

In the Neon console SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Run development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables with descriptions.

**Required for core functionality:**
- `DATABASE_URL` + `DIRECT_URL` — Neon PostgreSQL
- `NEXTAUTH_SECRET` — 32+ char random secret
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — Google OAuth
- `AUTH_RESEND_KEY` — Magic link emails
- `GEMINI_API_KEY` — AI quiz & tutor (primary)
- `GROQ_API_KEY` — AI fallback
- `BLOB_READ_WRITE_TOKEN` — File storage
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Caching

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Pull env vars locally after first deploy
vercel env pull .env.local
```

**Required Vercel settings:**
- Node.js 20.x runtime
- Add all environment variables from `.env.example`
- Enable Vercel Blob storage (adds `BLOB_READ_WRITE_TOKEN` automatically)

### Database Migrations in Production

```bash
# Run after deploy
npx prisma migrate deploy
```

---

## Testing

```bash
# Unit tests (SM-2, AI chunking, etc.)
npm test

# Watch mode
npm run test:watch

# E2E tests (requires running dev server)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

---

## AI Architecture

All AI calls go through `lib/ai/provider.ts`. Three public functions:

```typescript
// Generate quiz questions from text
generateQuiz({ text, questionCount, subjectName, userId })

// Stream tutor response (SSE)  
generateTutorReply({ messages, context, subjectName, userId })

// Create text embedding (768-dim)
createEmbedding(text)
```

### Fallback Chain

```
Request
  ↓
Gemini 2.5 Flash (primary)
  ↓ [on failure: retryable errors]
Retry with backoff (max 2 attempts)
  ↓ [on failure]
Groq LLaMA 3.3 70B (fallback)
  ↓ [on failure]
Throw AIError with both provider details
```

### Rate Limits

| Endpoint | Limit |
|---|---|
| Quiz generation | 5 per minute per user |
| Tutor messages | 20 per minute per user |
| File uploads | 5 per hour per user |

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test && npm run type-check`)
4. Commit your changes
5. Push and open a PR

---

## License

MIT — see [LICENSE](LICENSE)
