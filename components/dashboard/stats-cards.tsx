import { Card, CardContent } from "@/components/ui/card";
import { Flame, Trophy, BookOpen, Target, TrendingUp } from "lucide-react";
import type { getDashboardStats } from "@/lib/dal";

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

interface StatsCardsProps {
  stats: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Study Streak",
      value: `${stats.streakDays}d`,
      subLabel: stats.streakDays > 0 ? "Keep it up!" : "Start today!",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      highlight: stats.streakDays >= 7,
    },
    {
      label: "Total XP",
      value: stats.totalXp.toLocaleString(),
      subLabel: `${stats.subjectCount} subject${stats.subjectCount !== 1 ? "s" : ""}`,
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Due for Review",
      value: stats.dueCardsCount.toString(),
      subLabel: `of ${stats.totalCards} cards`,
      icon: Target,
      color: stats.dueCardsCount > 20 ? "text-red-500" : "text-blue-500",
      bg: stats.dueCardsCount > 20 ? "bg-red-500/10" : "bg-blue-500/10",
    },
    {
      label: "Mastery",
      value: `${stats.masteryPct}%`,
      subLabel: `${stats.masteredCards} cards mastered`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={card.highlight ? "ring-2 ring-orange-500/50 streak-glow" : ""}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-0.5">{card.value}</div>
            <div className="text-sm font-medium text-foreground/80">{card.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{card.subLabel}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
