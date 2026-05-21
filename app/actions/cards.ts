"use server";

import { z } from "zod";
import { requireUser, createCard, updateCardSM2, getDueCards, trackEvent } from "@/lib/dal";
import { applyReview, calculateXP, calculateStreak } from "@/lib/sm2";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const createCardSchema = z.object({
  topicId: z.string().cuid(),
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(2000),
  hint: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export async function createCardAction(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = createCardSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid data: " + parsed.error.errors[0]?.message };
    }

    const card = await createCard(parsed.data.topicId, user.id, parsed.data);
    revalidatePath(`/subjects`);
    return { data: card };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create card" };
  }
}

const reviewCardSchema = z.object({
  cardId: z.string().cuid(),
  quality: z.number().int().min(0).max(5),
  sessionId: z.string().cuid(),
  timeTakenMs: z.number().int().min(0).optional(),
});

export async function reviewCardAction(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = reviewCardSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid data: " + parsed.error.errors[0]?.message };
    }

    const { cardId, quality, timeTakenMs } = parsed.data;

    const card = await prisma.card.findFirst({
      where: { id: cardId, topic: { subject: { userId: user.id } } },
    });
    if (!card) return { error: "Card not found" };

    const sm2Result = applyReview(
      {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        dueAt: card.dueAt,
        lastReviewed: card.lastReviewed,
        avgQuality: card.avgQuality,
        reviewCount: card.reviewCount,
      },
      quality
    );

    await updateCardSM2(cardId, user.id, sm2Result);

    const wasCorrect = quality >= 3;
    return { data: { sm2: sm2Result, wasCorrect } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to record review" };
  }
}

export async function completeRevisionSessionAction(params: {
  sessionId: string;
  attempts: Array<{ quality: number; wasCorrect: boolean }>;
}) {
  try {
    const user = await requireUser();
    const { sessionId, attempts } = params;

    if (!sessionId || !Array.isArray(attempts)) {
      return { error: "Invalid params" };
    }

    const xpEarned = calculateXP(attempts);

    await prisma.revisionSession.update({
      where: { id: sessionId, userId: user.id },
      data: {
        completedAt: new Date(),
        cardsReviewed: attempts.length,
        xpEarned,
      },
    });

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { streakDays: true, lastStudiedAt: true, totalXp: true },
    });

    const newStreak = calculateStreak(
      [new Date()],
      userRecord?.streakDays ?? 0,
      userRecord?.lastStudiedAt ?? null
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalXp: { increment: xpEarned },
        streakDays: newStreak,
        lastStudiedAt: new Date(),
      },
    });

    await trackEvent(user.id, "revision.completed", {
      sessionId,
      cardsReviewed: attempts.length,
      xpEarned,
      correctCount: attempts.filter((a) => a.wasCorrect).length,
    });

    revalidatePath("/dashboard");
    return { data: { xpEarned, newStreak } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to complete session" };
  }
}

export async function startRevisionSessionAction(mode: "NORMAL" | "EMERGENCY" | "EXAM_PREP" = "NORMAL") {
  try {
    const user = await requireUser();
    const session = await prisma.revisionSession.create({
      data: { userId: user.id, mode },
    });
    return { data: session };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to start session" };
  }
}

export async function bulkCreateCardsAction(params: {
  topicId: string;
  cards: Array<{ front: string; back: string; hint?: string }>;
}) {
  try {
    const user = await requireUser();
    const { topicId, cards } = params;

    const topic = await prisma.topic.findFirst({
      where: { id: topicId, subject: { userId: user.id } },
      include: { subject: true },
    });
    if (!topic) return { error: "Topic not found" };

    if (!Array.isArray(cards) || cards.length === 0) {
      return { error: "No cards provided" };
    }

    const validCards = cards.filter(
      (c) => c.front?.trim() && c.back?.trim() && c.front.length <= 1000 && c.back.length <= 2000
    );

    if (validCards.length === 0) return { error: "No valid cards" };

    await prisma.card.createMany({
      data: validCards.map((c) => ({
        topicId,
        front: c.front.trim(),
        back: c.back.trim(),
        hint: c.hint?.trim(),
        sourceType: "AI_GENERATED",
      })),
    });

    await prisma.subject.update({
      where: { id: topic.subjectId },
      data: { cardCount: { increment: validCards.length } },
    });

    revalidatePath(`/subjects/${topic.subjectId}`);
    return { data: { created: validCards.length } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create cards" };
  }
}