import { Suspense } from "react";
import { requireUser, getDashboardStats, getWeakSubjects, getDueCards } from "@/lib/dal";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DueCardsWidget } from "@/components/dashboard/due-cards-widget";
import { WeakSubjectsWidget } from "@/components/dashboard/weak-subjects-widget";
import { RecentActivityChart } from "@/components/dashboard/recent-activity-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// Suspense boundaries for parallel streaming
async function StatsSection() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.id);
  return <StatsCards stats={stats} />;
}

async function DueCardsSection() {
  const user = await requireUser();
  const cards = await getDueCards(user.id, 10);
  return <DueCardsWidget cards={cards} />;
}

async function WeakSubjectsSection() {
  const user = await requireUser();
  const subjects = await getWeakSubjects(user.id);
  return <WeakSubjectsWidget subjects={subjects as any[]} />;
}

async function ActivitySection() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.id);
  return <RecentActivityChart sessions={stats.recentSessions} />;
}

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's how your learning is going today.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats cards — streams independently */}
      <Suspense fallback={<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>}>
        <StatsSection />
      </Suspense>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Due cards — takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <DueCardsSection />
          </Suspense>

          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <ActivitySection />
          </Suspense>
        </div>

        {/* Weak subjects — takes 1 col */}
        <div>
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <WeakSubjectsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
