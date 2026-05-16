"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";

interface Session {
  score: number | null;
  completedAt: Date | null;
  correctCount: number;
  totalCards: number;
}

interface RecentActivityChartProps {
  sessions: Session[];
}

export function RecentActivityChart({ sessions }: RecentActivityChartProps) {
  const data = sessions
    .filter((s) => s.completedAt)
    .map((s) => ({
      date: format(new Date(s.completedAt!), "MMM d"),
      score: Math.round(s.score ?? 0),
      cards: s.totalCards,
    }))
    .reverse();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Quiz Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Complete your first quiz to see your progress here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Quiz Scores</CardTitle>
        <CardDescription>Your last {data.length} quiz sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(val) => [`${val}%`, "Score"]}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.score >= 80
                      ? "hsl(142 76% 36%)"
                      : entry.score >= 60
                      ? "hsl(221 83% 53%)"
                      : "hsl(0 84% 60%)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
