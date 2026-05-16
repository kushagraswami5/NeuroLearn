import { Suspense } from "react";
import { requireUser, getDashboardStats, getWeakSubjects } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { calculateExamReadiness } from "@/lib/sm2";
import { AnalyticsCards, ExamReadinessWidget, SubjectMasteryChart, StudyHeatmap } from "@/components/analytics/analytics-cards";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

async function getAnalyticsData(userId: string) {
  const [stats, weakSubjects, allCards, recentEvents] = await Promise.all([
    getDashboardStats(userId),
    getWeakSubjects(userId),
    prisma.card.findMany({
      where: { topic: { subject: { userId } } },
      select: { easeFactor: true, interval: true, repetitions: true, dueAt: true, lastReviewed: true, avgQuality: true, reviewCount: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { event: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const readiness = calculateExamReadiness(allCards.map(c => ({
    ...c,
    lastReviewed: c.lastReviewed,
  })));

  return { stats, weakSubjects, readiness, recentEvents };
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const { stats, weakSubjects, readiness, recentEvents } = await getAnalyticsData(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your learning progress and identify areas for improvement.
        </p>
      </div>

      <AnalyticsCards stats={stats} readiness={readiness} />

      <div className="grid lg:grid-cols-2 gap-6">
        <ExamReadinessWidget readiness={readiness} />
        <SubjectMasteryChart weakSubjects={weakSubjects as any[]} />
      </div>

      <StudyHeatmap events={recentEvents} />
    </div>
  );
}
