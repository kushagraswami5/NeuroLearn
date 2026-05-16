"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { Brain, Target, TrendingUp, Zap, Flame } from "lucide-react";

interface AnalyticsChartsProps {
  stats: {
    streakDays: number;
    totalXp: number;
    totalCards: number;
    dueCardsCount: number;
    masteredCards: number;
    masteryPct: number;
    recentSessions: Array<{ score: number | null; completedAt: Date | null; correctCount: number; totalCards: number }>;
    subjectCount: number;
  };
  weakSubjects: Array<{
    id: string;
    name: string;
    color: string;
    emoji: string;
    masteryScore: number;
    cardCount: number;
    avgQuality: number;
  } | null>;
  readiness: {
    score: number;
    breakdown: {
      masteredCards: number;
      dueCards: number;
      weakCards: number;
      totalCards: number;
    };
  };
  activityData: Array<{ date: string; count: number }>;
  allCards: Array<{ easeFactor: number; repetitions: number; avgQuality: number }>;
}

export function AnalyticsCharts({
  stats,
  weakSubjects,
  readiness,
  activityData,
  allCards,
}: AnalyticsChartsProps) {
  // Ease factor distribution
  const efBuckets = [
    { label: "Weak\n<1.5", range: [0, 1.5], color: "#ef4444" },
    { label: "Learning\n1.5–2.0", range: [1.5, 2.0], color: "#f59e0b" },
    { label: "Good\n2.0–2.3", range: [2.0, 2.3], color: "#3b82f6" },
    { label: "Strong\n>2.3", range: [2.3, 3], color: "#10b981" },
  ];
  const efData = efBuckets.map((b) => ({
    label: b.label.replace("\n", " "),
    count: allCards.filter((c) => c.easeFactor >= b.range[0] && c.easeFactor < b.range[1]).length,
    color: b.color,
  }));

  // Card mastery pie chart
  const pieData = [
    { name: "Mastered", value: readiness.breakdown.masteredCards, fill: "#10b981" },
    {
      name: "Learning",
      value: readiness.breakdown.totalCards - readiness.breakdown.masteredCards - readiness.breakdown.weakCards,
      fill: "#3b82f6",
    },
    { name: "Weak", value: readiness.breakdown.weakCards, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Session scores over time
  const sessionData = stats.recentSessions
    .filter((s) => s.completedAt)
    .map((s) => ({
      date: format(new Date(s.completedAt!), "MMM d"),
      score: Math.round(s.score ?? 0),
    }))
    .reverse();

  return (
    <div className="space-y-5">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Brain className="w-5 h-5 text-primary" />}
          label="Exam Readiness"
          value={`${readiness.score}%`}
          sub="Overall readiness score"
          bg="bg-primary/10"
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Study Streak"
          value={`${stats.streakDays}d`}
          sub="Consecutive days studied"
          bg="bg-orange-500/10"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-green-500" />}
          label="Cards Mastered"
          value={`${readiness.breakdown.masteredCards}`}
          sub={`of ${readiness.breakdown.totalCards} total`}
          bg="bg-green-500/10"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          label="Total XP"
          value={stats.totalXp.toLocaleString()}
          sub="Experience earned"
          bg="bg-yellow-500/10"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Activity heatmap (simplified bar chart for 30 days) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">30-Day Activity</CardTitle>
            <CardDescription className="text-xs">Events per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={activityData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={6}
                  tickFormatter={(d) => format(new Date(d), "MMM d")}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                  labelFormatter={(d) => format(new Date(d as string), "MMM d, yyyy")}
                  formatter={(v) => [v, "events"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(221 83% 53%)"
                  fill="url(#activityGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quiz score trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quiz Scores</CardTitle>
            <CardDescription className="text-xs">Recent quiz performance</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionData.length === 0 ? (
              <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                No quiz sessions yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={sessionData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                    formatter={(v) => [`${v}%`, "Score"]}
                  />
                  <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                    {sessionData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.score >= 80
                            ? "#10b981"
                            : d.score >= 60
                            ? "#3b82f6"
                            : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Card mastery distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Card Mastery Distribution</CardTitle>
            <CardDescription className="text-xs">
              {readiness.breakdown.totalCards} total cards
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
                No cards yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ease factor distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ease Factor Distribution</CardTitle>
            <CardDescription className="text-xs">SM-2 difficulty breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {efData.map((bucket) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="font-medium">{bucket.count} cards</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: allCards.length > 0 ? `${(bucket.count / allCards.length) * 100}%` : "0%",
                      backgroundColor: bucket.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Weak subjects detail */}
      {weakSubjects.filter(Boolean).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              Subjects Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakSubjects.filter(Boolean).map((subject) => subject && (
              <div key={subject.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{subject.emoji}</span>
                    <span className="text-sm font-medium">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={subject.masteryScore < 40 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {subject.masteryScore}% mastery
                    </Badge>
                  </div>
                </div>
                <Progress value={subject.masteryScore} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {subject.cardCount} cards · avg quality {subject.avgQuality.toFixed(1)}/5
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-sm font-medium text-foreground/80">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  );
}
