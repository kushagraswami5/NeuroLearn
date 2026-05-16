import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import { env } from "@/lib/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_TTL = {
  quiz: 60 * 60 * 24,     // 24h — quiz questions from same content
  embedding: 60 * 60 * 24 * 7, // 7d — embeddings are deterministic
  tutor: 60 * 60,          // 1h — tutor responses
} as const;

export function makeCacheKey(namespace: string, ...parts: string[]): string {
  const content = parts.join("|");
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `neurolearn:${namespace}:${hash}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get<T>(key);
    return val;
  } catch {
    // Cache miss is fine — degrade gracefully
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  namespace: keyof typeof CACHE_TTL
): Promise<void> {
  try {
    await redis.setex(key, CACHE_TTL[namespace], value);
  } catch {
    // Non-fatal: cache write failure should never block the main path
  }
}

export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  try {
    // Upstash supports SCAN for key deletion
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== 0);
  } catch {
    // Non-fatal
  }
}

// Rate limiting using sliding window
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `neurolearn:ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, 0, now - windowMs);
    pipe.zadd(key, { score: now, member: `${now}` });
    pipe.zcard(key);
    pipe.expire(key, windowSeconds + 1);

    const results = await pipe.exec();
    const count = (results[2] as number) || 0;
    const resetAt = Math.floor((now + windowMs) / 1000);

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt,
    };
  } catch {
    // On Redis failure, allow the request (fail open for availability)
    return { allowed: true, remaining: maxRequests, resetAt: 0 };
  }
}

export { redis };
