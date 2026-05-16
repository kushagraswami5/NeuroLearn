import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string(),
  AUTH_GOOGLE_SECRET: z.string(),
  AUTH_RESEND_KEY: z.string(),

  // AI Providers
  GEMINI_API_KEY: z.string(),
  GROQ_API_KEY: z.string(),

  // Storage
  BLOB_READ_WRITE_TOKEN: z.string(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

 QSTASH_TOKEN: z.string(),
 QSTASH_CURRENT_SIGNING_KEY: z.string(),
 QSTASH_NEXT_SIGNING_KEY: z.string(),

  // Observability (optional in dev)
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // Stripe (optional in MVP)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// Validate on startup — crashes fast if misconfigured
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(_parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = _parsed.data;
