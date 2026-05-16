import { AIError, type AIProvider } from "./schemas";

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 2,
  delayMs: 500,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an AI call with automatic fallback between providers.
 *
 * Pattern: try primary → on failure, try fallback → throw if both fail.
 * Retries retryable errors within each provider.
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  retryConfig: Partial<RetryConfig> = {}
): Promise<{ result: T; usedFallback: boolean }> {
  const config = { ...DEFAULT_RETRY, ...retryConfig };

  // Try primary provider with retries
  try {
    const result = await withRetry(primary, config, "gemini");
    return { result, usedFallback: false };
  } catch (primaryError) {
    console.warn("[AI Fallback] Primary provider failed, trying fallback:", primaryError);

    // Try fallback provider with retries
    try {
      const result = await withRetry(fallback, config, "groq");
      return { result, usedFallback: true };
    } catch (fallbackError) {
      // Both failed — throw the most informative error
      const msg = `Both providers failed. Primary: ${primaryError instanceof Error ? primaryError.message : "unknown"}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : "unknown"}`;
      throw new AIError(msg, "groq", "ALL_PROVIDERS_FAILED", false);
    }
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  provider: AIProvider
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Only retry if the error is marked retryable
      if (err instanceof AIError && !err.retryable) {
        throw err;
      }

      if (attempt < config.maxAttempts) {
        const delay = config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        console.warn(
          `[AI Retry] ${provider} attempt ${attempt}/${config.maxAttempts} failed, waiting ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sanitize AI output to prevent prompt injection in downstream use.
 */
export function sanitizeAIOutput(text: string): string {
  // Remove potential injection attempts in AI responses
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\[SYSTEM\]/gi, "")
    .replace(/\[INST\]/gi, "")
    .trim();
}

/**
 * Estimate token count (rough: 1 token ≈ 4 chars for English).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Content truncated to fit context window]";
}
