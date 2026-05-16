"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { TrendingUp, Target, Brain, Calendar } from "lucide-react";

// ─── Analytics Cards ─────────────────────────────────────────────────────────

interface AnalyticsCardsProps {
  stats: { totalCards: number; masteredCards: number; masteryPct: number; dueCardsCount: number; streakDays: number; totalXp: number };
  readiness: { score: number; breakdown: { masteredCards: number; dueCards: number; weakCards: number; totalCards: number } };
}

export function AnalyticsCards({ stats, readiness }: AnalyticsCardsProps) {
  const cards = [
    { label: "Exam Readiness", value: `${readiness.score}%`, color: readiness.score >= 70 ? "text-green-500" : readiness.score >= 40 ? "text-yellow-500" : "text-red-500", icon: Target, desc: "Overall preparedness score" },
    { label: "Cards Mastered", value: `${stats.masteredCards}`, color: "text-blue-500", icon: Brain, desc: `${stats.masteryPct}% of ${stats.totalCards} total` },
    { label: "Study Streak", value: `${stats.streakDays}d`, color: "text-orange-500", icon: TrendingUp, desc: "Consecutive study days" },
    { label: "Total XP", value: stats.totalXp.toLocaleString(), color: "text-purple-500", icon: Calendar, desc: "Experience points earned" },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-5">
            <div className={`mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm font-medium mt-0.5">{c.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Exam Readiness Widget ────────────────────────────────────────────────────

interface ExamReadinessWidgetProps {
  readiness: { score: number; breakdown: { masteredCards: number; dueCards: number; weakCards: number; totalCards: number } };
}

export function ExamReadinessWidget({ readiness }: ExamReadinessWidgetProps) {
  const { score, breakdown } = readiness;
  const data = [{ value: score, fill: score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444" }];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Exam Readiness</CardTitle>
        <CardDescription>Based on mastery, reviews, and card health</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{score}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Mastered</span>
                <span>{breakdown.masteredCards}/{breakdown.totalCards}</span>
              </div>
              <Progress value={breakdown.totalCards > 0 ? (breakdown.masteredCards / breakdown.totalCards) * 100 : 0} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-500">Due Overdue</span>
                <span>{breakdown.dueCards}</span>
              </div>
              <Progress value={breakdown.totalCards > 0 ? (breakdown.dueCards / breakdown.totalCards) * 100 : 0} className="h-1.5 [&>div]:bg-red-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-yellow-500">Weak Cards</span>
                <span>{breakdown.weakCards}</span>
              </div>
              <Progress value={breakdown.totalCards > 0 ? (breakdown.weakCards / breakdown.totalCards) * 100 : 0} className="h-1.5 [&>div]:bg-yellow-500" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Subject Mastery Chart ────────────────────────────────────────────────────

interface SubjectMasteryChartProps {
  weakSubjects: Array<{ id: string; name: string; masteryScore: number; cardCount: number }>;
}

export function SubjectMasteryChart({ weakSubjects }: SubjectMasteryChartProps) {
  if (weakSubjects.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Subject Mastery</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Add subjects and cards to see mastery data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Subject Mastery</CardTitle>
        <CardDescription>Weakest subjects first</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weakSubjects} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val) => [`${val}%`, "Mastery"]} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="masteryScore" radius={[0, 4, 4, 0]}>
              {weakSubjects.map((entry, i) => (
                <Cell key={i} fill={entry.masteryScore >= 70 ? "#22c55e" : entry.masteryScore >= 40 ? "#f59e0b" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Study Heatmap ────────────────────────────────────────────────────────────

interface StudyHeatmapProps {
  events: Array<{ event: string; createdAt: Date }>;
}

export function StudyHeatmap({ events }: StudyHeatmapProps) {
  // Count events per day (last 30 days)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const countsByDay = events.reduce((acc, e) => {
    const day = new Date(e.createdAt);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCount = Math.max(...Object.values(countsByDay), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Study Activity</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 flex-wrap">
          {days.map((day) => {
            const count = countsByDay[day.toISOString()] ?? 0;
            const intensity = count / maxCount;
            return (
              <div
                key={day.toISOString()}
                title={`${day.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}: ${count} events`}
                className="w-7 h-7 rounded-sm transition-colors"
                style={{
                  backgroundColor: count === 0
                    ? "hsl(var(--muted))"
                    : `hsl(142 76% ${Math.round(20 + intensity * 30)}%)`,
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((i) => (
            <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: i === 0 ? "hsl(var(--muted))" : `hsl(142 76% ${Math.round(20 + i * 30)}%)` }} />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
