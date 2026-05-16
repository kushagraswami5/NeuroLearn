import { describe, it, expect } from "vitest";
import { applyReview, calculateExamReadiness, calculateXP, calculateStreak } from "@/lib/sm2";

const BASE_CARD = {
  easeFactor: 2.5,
  interval: 1,
  repetitions: 0,
  dueAt: new Date(),
  lastReviewed: null,
  avgQuality: 0,
  reviewCount: 0,
};

describe("SM-2 Algorithm", () => {
  describe("applyReview", () => {
    it("first successful review sets interval to 1", () => {
      const result = applyReview(BASE_CARD, 4);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
    });

    it("second successful review sets interval to 6", () => {
      const card = { ...BASE_CARD, repetitions: 1, interval: 1 };
      const result = applyReview(card, 4);
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6);
    });

    it("subsequent reviews multiply by ease factor", () => {
      const card = { ...BASE_CARD, repetitions: 2, interval: 6, easeFactor: 2.5 };
      const result = applyReview(card, 4);
      expect(result.interval).toBe(Math.round(6 * 2.5));
    });

    it("failed review (quality < 3) resets repetitions and interval", () => {
      const card = { ...BASE_CARD, repetitions: 5, interval: 30, easeFactor: 2.5 };
      const result = applyReview(card, 2);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it("ease factor decreases on poor quality", () => {
      const result = applyReview(BASE_CARD, 2);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it("ease factor increases on perfect recall", () => {
      const result = applyReview(BASE_CARD, 5);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it("ease factor never goes below 1.3", () => {
      let card = { ...BASE_CARD };
      // Apply many poor reviews
      for (let i = 0; i < 20; i++) {
        card = { ...card, ...applyReview(card, 0) };
      }
      expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("ease factor never exceeds 2.5", () => {
      let card = { ...BASE_CARD };
      for (let i = 0; i < 20; i++) {
        card = { ...card, ...applyReview(card, 5) };
      }
      expect(card.easeFactor).toBeLessThanOrEqual(2.5);
    });

    it("interval capped at 365 days", () => {
      const card = { ...BASE_CARD, repetitions: 2, interval: 300, easeFactor: 2.5 };
      const result = applyReview(card, 5);
      expect(result.interval).toBeLessThanOrEqual(365);
    });

    it("updates avgQuality correctly", () => {
      const result = applyReview(BASE_CARD, 4);
      expect(result.avgQuality).toBe(4);
      expect(result.reviewCount).toBe(1);
    });

    it("due date is in the future after successful review", () => {
      const result = applyReview(BASE_CARD, 4);
      expect(result.dueAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("clamps quality to 0-5 range", () => {
      const r1 = applyReview(BASE_CARD, -1);
      const r2 = applyReview(BASE_CARD, 10);
      // Should not throw and produce valid results
      expect(r1.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(r2.easeFactor).toBeLessThanOrEqual(2.5);
    });
  });

  describe("calculateExamReadiness", () => {
    it("returns 0 for empty card list", () => {
      const result = calculateExamReadiness([]);
      expect(result.score).toBe(0);
    });

    it("returns high score when all cards are mastered and not due", () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const cards = Array.from({ length: 10 }, () => ({
        ...BASE_CARD,
        easeFactor: 2.2,
        repetitions: 5,
        dueAt: future,
        avgQuality: 4.5,
      }));
      const result = calculateExamReadiness(cards);
      expect(result.score).toBeGreaterThan(50);
    });

    it("returns low score when cards are all weak and overdue", () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const cards = Array.from({ length: 10 }, () => ({
        ...BASE_CARD,
        easeFactor: 1.3,
        repetitions: 0,
        dueAt: past,
        avgQuality: 1,
      }));
      const result = calculateExamReadiness(cards);
      expect(result.score).toBeLessThan(30);
    });
  });

  describe("calculateXP", () => {
    it("awards XP for correct answers proportional to quality", () => {
      const xp = calculateXP([{ quality: 5, wasCorrect: true }]);
      expect(xp).toBeGreaterThan(0);
    });

    it("awards small XP even for wrong answers", () => {
      const xp = calculateXP([{ quality: 0, wasCorrect: false }]);
      expect(xp).toBeGreaterThan(0);
    });

    it("perfect answers give more XP than passing answers", () => {
      const xpPerfect = calculateXP([{ quality: 5, wasCorrect: true }]);
      const xpPassing = calculateXP([{ quality: 3, wasCorrect: true }]);
      expect(xpPerfect).toBeGreaterThan(xpPassing);
    });

    it("accumulates XP across multiple attempts", () => {
      const xpSingle = calculateXP([{ quality: 4, wasCorrect: true }]);
      const xpMultiple = calculateXP([
        { quality: 4, wasCorrect: true },
        { quality: 4, wasCorrect: true },
      ]);
      expect(xpMultiple).toBeGreaterThan(xpSingle);
    });
  });

  describe("calculateStreak", () => {
    it("returns 1 if no previous study date", () => {
      const streak = calculateStreak([new Date()], 0, null);
      expect(streak).toBe(1);
    });

    it("increments streak if studied yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const streak = calculateStreak([new Date()], 5, yesterday);
      expect(streak).toBe(6);
    });

    it("resets streak if last study was 2+ days ago", () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const streak = calculateStreak([new Date()], 10, twoDaysAgo);
      expect(streak).toBe(1);
    });

    it("does not increment if already studied today", () => {
      const today = new Date();
      const streak = calculateStreak([today], 3, today);
      expect(streak).toBe(3);
    });
  });
});
