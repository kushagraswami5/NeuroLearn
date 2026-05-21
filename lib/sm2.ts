/**
 * NeuroLearn SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak.
 * Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 *
 * Quality ratings (0-5):
 *   5 — Perfect recall, no hesitation
 *   4 — Correct with minor hesitation
 *   3 — Correct with significant difficulty
 *   2 — Incorrect, but correct answer seemed easy on reveal
 *   1 — Incorrect, correct answer remembered when shown
 *   0 — Complete blackout
 */

export interface SM2Card {
  easeFactor: number; // 1.3 – 2.5, starts at 2.5
  interval: number; // days until next review, starts at 1
  repetitions: number; // number of successful consecutive reviews
  dueAt: Date;
  lastReviewed: Date | null;
  avgQuality: number;
  reviewCount: number;
}

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueAt: Date;
  lastReviewed: Date;
  avgQuality: number;
  reviewCount: number;
}

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.5;
const PASSING_QUALITY = 3; // Below this → reset repetitions

/**
 * Apply SM-2 algorithm to a card after a review.
 *
 * @param card - Current card state
 * @param quality - Review quality 0–5
 * @returns Updated card state
 */
export function applyReview(
  card: SM2Card,
  quality: number
): SM2Result {
  const clampedQuality = Math.max(
    0,
    Math.min(5, Math.round(quality))
  );

  const now = new Date();

  let { easeFactor, interval, repetitions } = card;

  if (clampedQuality >= PASSING_QUALITY) {
    // Successful recall
    switch (repetitions) {
      case 0:
        interval = 1;
        break;

      case 1:
        interval = 6;
        break;

      default:
        interval = Math.round(interval * easeFactor);
    }

    repetitions += 1;
  } else {
    // Failed recall — reset to beginning
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor =
    easeFactor +
    (
      0.1 -
      (5 - clampedQuality) *
        (0.08 + (5 - clampedQuality) * 0.02)
    );

  easeFactor = Math.max(
    MIN_EASE_FACTOR,
    Math.min(MAX_EASE_FACTOR, easeFactor)
  );

  // Cap interval at 365 days
  interval = Math.min(interval, 365);

  // Calculate next due date
  const dueAt = new Date(now);

  dueAt.setDate(dueAt.getDate() + interval);

  // Due at start of day
  dueAt.setHours(0, 0, 0, 0);

  // Update rolling average quality
  const totalReviews = card.reviewCount + 1;

  const avgQuality =
    (
      card.avgQuality * card.reviewCount +
      clampedQuality
    ) / totalReviews;

  return {
    easeFactor: Math.round(easeFactor * 1000) / 1000,
    interval,
    repetitions,
    dueAt,
    lastReviewed: now,
    avgQuality: Math.round(avgQuality * 100) / 100,
    reviewCount: totalReviews,
  };
}

/**
 * Get due cards for a user, sorted by priority.
 * Cards most overdue and with lowest ease factor come first.
 */
export function sortByPriority(
  cards: Array<SM2Card & { id: string }>
): Array<SM2Card & { id: string }> {
  const now = Date.now();

  // Explicitly preserve type after spread
  const typedCards: Array<SM2Card & { id: string }> = [...cards];

  return typedCards.sort((a, b) => {
    const aOverdue = now - a.dueAt.getTime();
    const bOverdue = now - b.dueAt.getTime();

    // Prioritize:
    // overdue > low ease factor > many repetitions
    const aScore =
      aOverdue / 1000 / 60 / 60 / 24 +
      (2.5 - a.easeFactor) * 3;

    const bScore =
      bOverdue / 1000 / 60 / 60 / 24 +
      (2.5 - b.easeFactor) * 3;

    return bScore - aScore;
  });
}

/**
 * Calculate exam readiness score (0-100)
 * from card statistics.
 */
export function calculateExamReadiness(
  cards: SM2Card[]
): {
  score: number;
  breakdown: {
    masteredCards: number;
    dueCards: number;
    weakCards: number;
    totalCards: number;
  };
} {
  if (cards.length === 0) {
    return {
      score: 0,
      breakdown: {
        masteredCards: 0,
        dueCards: 0,
        weakCards: 0,
        totalCards: 0,
      },
    };
  }

  const now = new Date();

  const masteredCards = cards.filter(
    (c) =>
      c.easeFactor >= 2.0 &&
      c.repetitions >= 3 &&
      c.dueAt > now
  ).length;

  const dueCards = cards.filter(
    (c) => c.dueAt <= now
  ).length;

  const weakCards = cards.filter(
    (c) =>
      c.easeFactor < 1.7 ||
      c.avgQuality < 2.5
  ).length;

  // Readiness formula:
  // Mastery ratio (40%)
  // + Not-overdue ratio (40%)
  // + Not-weak ratio (20%)

  const masteryRatio =
    masteredCards / cards.length;

  const notDueRatio =
    (cards.length - dueCards) / cards.length;

  const notWeakRatio =
    (cards.length - weakCards) / cards.length;

  const score = Math.round(
    masteryRatio * 40 +
      notDueRatio * 40 +
      notWeakRatio * 20
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: {
      masteredCards,
      dueCards,
      weakCards,
      totalCards: cards.length,
    },
  };
}

/**
 * Calculate XP earned from a review session.
 */
export function calculateXP(
  attempts: Array<{
    quality: number;
    wasCorrect: boolean;
  }>
): number {
  let xp = 0;

  for (const attempt of attempts) {
    if (attempt.wasCorrect) {
      // 16–20 XP for perfect recall
      xp += 10 + attempt.quality * 2;
    } else {
      // Small XP even for failures
      xp += 2;
    }
  }

  return xp;
}

/**
 * Determine streak:
 * consecutive days with at least 1 review.
 */
export function calculateStreak(
  reviewDates: Date[],
  currentStreak: number,
  lastStudiedAt: Date | null
): number {
  if (reviewDates.length === 0) {
    return currentStreak;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);

  yesterday.setDate(yesterday.getDate() - 1);

  if (!lastStudiedAt) {
    return 1;
  }

  const lastDay = new Date(lastStudiedAt);

  lastDay.setHours(0, 0, 0, 0);

  if (lastDay.getTime() === today.getTime()) {
    // Already studied today
    return currentStreak;
  }

  if (lastDay.getTime() === yesterday.getTime()) {
    // Continuing streak
    return currentStreak + 1;
  }

  // Streak broken
  return 1;
}
