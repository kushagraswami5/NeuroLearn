"use server";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { trackEvent } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { QuizQuestion } from "@/lib/ai/schemas";
import { calculateStreak } from "@/lib/sm2";

const saveResultsSchema = z.object({
  subjectId: z.string().cuid().optional(),
  topicId: z.string().cuid().optional(),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    correctId: z.string(),
    difficulty: z.string(),
    options: z.array(z.object({ id: z.string(), text: z.string() })),
    explanation: z.string().optional(),
  })).min(1).max(30),
  answers: z.record(z.string(), z.string()),
  score: z.number().min(0).max(100),
  correctCount: z.number().int().min(0),
});

export async function saveQuizResultsAction(data: {
  subjectId?: string;
  topicId?: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  score: number;
  correctCount: number;
}) {
  try {
    const user = await requireUser();

    const parsed = saveResultsSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[quiz] Validation failed:", parsed.error.errors);
      return { error: "Invalid data: " + parsed.error.errors[0]?.message };
    }

    const xpEarned = Math.round(parsed.data.score / 5);

    // Keep transaction small — only session + user update
    const { session, newStreak } = await prisma.$transaction(async (tx) => {
      const userRecord = await tx.user.findUnique({
        where: { id: user.id },
        select: { streakDays: true, lastStudiedAt: true },
      });

      const newStreak = calculateStreak(
        [new Date()],
        userRecord?.streakDays ?? 0,
        userRecord?.lastStudiedAt ?? null
      );

      const session = await tx.quizSession.create({
        data: {
          userId: user.id,
          subjectId: parsed.data.subjectId || null,
          status: "COMPLETED",
          totalCards: parsed.data.questions.length,
          correctCount: parsed.data.correctCount,
          score: parsed.data.score,
          completedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          totalXp: { increment: xpEarned },
          streakDays: newStreak,
          lastStudiedAt: new Date(),
        },
      });

      return { session, newStreak };
    });

    // Card creation outside transaction to free up connection immediately
    let cardsCreated = 0;
    if (parsed.data.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: parsed.data.topicId, subject: { userId: user.id } },
      });

      if (topic) {
        await prisma.card.createMany({
          data: parsed.data.questions.map((q) => ({
            topicId: parsed.data.topicId!,
            front: q.question,
            back: q.options.find((o) => o.id === q.correctId)?.text ?? "",
            hint: q.explanation ?? null,
            sourceType: "AI_GENERATED",
          })),
        });

        await prisma.subject.update({
          where: { id: topic.subjectId },
          data: { cardCount: { increment: parsed.data.questions.length } },
        });

        cardsCreated = parsed.data.questions.length;
      }
    }

    await trackEvent(user.id, "quiz.completed", {
      sessionId: session.id,
      score: parsed.data.score,
      questionCount: parsed.data.questions.length,
      correctCount: parsed.data.correctCount,
      xpEarned,
      cardsCreated,
    });

    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/subjects");

    return { data: { session, xpEarned, newStreak, cardsCreated } };

  } catch (err) {
    console.error("[quiz] saveQuizResultsAction failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to save results" };
  }
}