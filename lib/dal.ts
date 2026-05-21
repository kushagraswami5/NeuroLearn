/**
 * NeuroLearn Data Access Layer
 *
 * ALL database queries MUST go through this module.
 * Security: every query is scoped to the authenticated user's ID.
 * No direct prisma calls in Server Actions or Route Handlers.
 */

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Subject, Topic, Card, QuizSession, ChatMessage, UploadedFile } from "@prisma/client";

// ─── Auth Helpers ───────────────────────────────────────────────────────────────

/** Get current session — throws if unauthenticated */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; email: string; name?: string | null; image?: string | null };
}

// ─── Subjects ──────────────────────────────────────────────────────────────────

export async function getSubjects(userId: string) {
  return prisma.subject.findMany({
    where: { userId },
    include: {
      topics: {
        include: {
          _count: { select: { cards: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { topics: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSubjectById(id: string, userId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id, userId },
    include: {
      topics: {
        include: {
          cards: true,
          },
          _count: { select: { cards: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { topics: true } },  // <-- this was missing
    },
  });

  if (!subject) throw new Error("Subject not found");
  return subject;
}

export async function createSubject(
  userId: string,
  data: { name: string; description?: string; color?: string; emoji?: string; examDate?: Date }
) {
  return prisma.subject.create({
    data: { userId, ...data },
  });
}

export async function updateSubject(
  id: string,
  userId: string,
  data: Partial<{ name: string; description: string; color: string; emoji: string; examDate: Date | null }>
) {
  const subject = await prisma.subject.findFirst({ where: { id, userId } });
  if (!subject) throw new Error("Subject not found");
  return prisma.subject.update({ where: { id }, data });
}

export async function deleteSubject(id: string, userId: string) {
  const subject = await prisma.subject.findFirst({ where: { id, userId } });
  if (!subject) throw new Error("Subject not found");
  return prisma.subject.delete({ where: { id } });
}

// ─── Topics ────────────────────────────────────────────────────────────────────

export async function createTopic(
  subjectId: string,
  userId: string,
  data: { name: string; description?: string }
) {
  // Verify ownership
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) throw new Error("Subject not found");

  const maxOrder = await prisma.topic.aggregate({
    where: { subjectId },
    _max: { order: true },
  });

  return prisma.topic.create({
    data: { subjectId, ...data, order: (maxOrder._max.order ?? -1) + 1 },
  });
}

export async function getTopicWithCards(topicId: string, userId: string) {
  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      subject: { userId },
    },
    include: {
      cards: { orderBy: { createdAt: "desc" } },
      subject: { select: { name: true, color: true, userId: true } },
    },
  });

  if (!topic) throw new Error("Topic not found");
  return topic;
}

// ─── Cards ─────────────────────────────────────────────────────────────────────

export async function getDueCards(userId: string, limit = 50) {
  return prisma.card.findMany({
    where: {
      topic: { subject: { userId } },
      dueAt: { lte: new Date() },
    },
    include: {
      topic: {
        include: { subject: { select: { name: true, color: true, emoji: true } } },
      },
    },
    orderBy: [{ easeFactor: "asc" }, { dueAt: "asc" }],
    take: limit,
  });
}

export async function getWeakCards(userId: string, limit = 20) {
  return prisma.card.findMany({
    where: {
      topic: { subject: { userId } },
      easeFactor: { lt: 1.8 },
    },
    include: {
      topic: {
        include: { subject: { select: { name: true, color: true, emoji: true } } },
      },
    },
    orderBy: { easeFactor: "asc" },
    take: limit,
  });
}

export async function createCard(
  topicId: string,
  userId: string,
  data: { front: string; back: string; hint?: string; tags?: string[] }
) {
  // Verify ownership
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subject: { userId } },
  });
  if (!topic) throw new Error("Topic not found");

  const card = await prisma.card.create({ data: { topicId, ...data } });

  // Update subject card count
  await prisma.subject.update({
    where: { id: topic.subjectId },
    data: { cardCount: { increment: 1 } },
  });

  return card;
}

export async function updateCardSM2(
  cardId: string,
  userId: string,
  sm2: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueAt: Date;
    lastReviewed: Date;
    avgQuality: number;
    reviewCount: number;
  }
) {
  // Verify ownership
  const card = await prisma.card.findFirst({
    where: { id: cardId, topic: { subject: { userId } } },
  });
  if (!card) throw new Error("Card not found");

  return prisma.card.update({ where: { id: cardId }, data: sm2 });
}

// ─── Quiz Sessions ─────────────────────────────────────────────────────────────

export async function createQuizSession(
  userId: string,
  data: { subjectId?: string; mode?: "STANDARD" | "TIMED" | "EMERGENCY" | "EXAM_PREP"; timeLimitSec?: number }
) {
  return prisma.quizSession.create({ data: { userId, ...data } });
}

export async function getQuizSession(sessionId: string, userId: string) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      attempts: { include: { card: true } },
      subject: { select: { name: true } },
    },
  });
  if (!session) throw new Error("Session not found");
  return session;
}

export async function completeQuizSession(
  sessionId: string,
  userId: string,
  results: { correctCount: number; totalCards: number; score: number }
) {
  const session = await prisma.quizSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Session not found");

  return prisma.quizSession.update({
    where: { id: sessionId },
    data: { ...results, status: "COMPLETED", completedAt: new Date() },
  });
}

// ─── Chat Messages ─────────────────────────────────────────────────────────────

export async function getChatHistory(userId: string, limit = 50) {
  return prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function saveChatMessage(
  userId: string,
  data: { role: "USER" | "ASSISTANT"; content: string; citations?: object; model?: string; tokens?: number }
) {
  return prisma.chatMessage.create({ data: { userId, ...data } });
}

export async function clearChatHistory(userId: string) {
  return prisma.chatMessage.deleteMany({ where: { userId } });
}

// ─── Uploaded Files ────────────────────────────────────────────────────────────

export async function getUserFiles(userId: string) {
  return prisma.uploadedFile.findMany({
    where: { userId },
    include: { subject: { select: { name: true } }, topic: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFileById(fileId: string, userId: string) {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId } });
  if (!file) throw new Error("File not found");
  return file;
}

export async function deleteFile(fileId: string, userId: string) {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, userId } });
  if (!file) throw new Error("File not found");
  return prisma.uploadedFile.delete({ where: { id: fileId } });
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export async function trackEvent(
  userId: string,
  event: string,
  props?: Record<string, unknown>
) {
  return prisma.analyticsEvent.create({
    data: { userId, event, props },
  });
}

export async function getDashboardStats(userId: string) {
  const [
    user,
    totalCards,
    dueCardsCount,
    masteredCards,
    recentSessions,
    subjectCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true, totalXp: true, lastStudiedAt: true },
    }),
    prisma.card.count({ where: { topic: { subject: { userId } } } }),
    prisma.card.count({
      where: { topic: { subject: { userId } }, dueAt: { lte: new Date() } },
    }),
    prisma.card.count({
      where: {
        topic: { subject: { userId } },
        easeFactor: { gte: 2.0 },
        repetitions: { gte: 3 },
      },
    }),
    prisma.quizSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 7,
      select: { score: true, completedAt: true, correctCount: true, totalCards: true },
    }),
    prisma.subject.count({ where: { userId } }),
  ]);

  return {
    streakDays: user?.streakDays ?? 0,
    totalXp: user?.totalXp ?? 0,
    lastStudiedAt: user?.lastStudiedAt,
    totalCards,
    dueCardsCount,
    masteredCards,
    masteryPct: totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0,
    recentSessions,
    subjectCount,
  };
}

export async function getWeakSubjects(userId: string) {
  const subjects = await prisma.subject.findMany({
    where: { userId },
    include: {
      topics: {
        include: {
          cards: {
            select: { easeFactor: true, avgQuality: true },
          },
        },
      },
    },
  });

  return subjects
    .map((subject) => {
      const allCards = subject.topics.flatMap((t) => t.cards);
      if (allCards.length === 0) return null;

      const avgEaseFactor =
        allCards.reduce((sum, c) => sum + c.easeFactor, 0) / allCards.length;
      const avgQuality =
        allCards.reduce((sum, c) => sum + c.avgQuality, 0) / allCards.length;

      return {
        id: subject.id,
        name: subject.name,
        color: subject.color,
        emoji: subject.emoji,
        cardCount: allCards.length,
        avgEaseFactor: Math.round(avgEaseFactor * 100) / 100,
        avgQuality: Math.round(avgQuality * 100) / 100,
        masteryScore: Math.round((avgEaseFactor / 2.5) * 100),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.masteryScore - b!.masteryScore))
    .slice(0, 3);
}
