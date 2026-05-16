import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

interface WeakSubject {
  id: string;
  name: string;
  color: string;
  emoji: string;
  cardCount: number;
  masteryScore: number;
  avgQuality: number;
}

interface WeakSubjectsWidgetProps {
  subjects: WeakSubject[];
}

export function WeakSubjectsWidget({ subjects }: WeakSubjectsWidgetProps) {
  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weak Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No weak subjects detected yet. Keep studying!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          Needs Attention
        </CardTitle>
        <CardDescription>Subjects with lowest mastery scores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span>{subject.emoji}</span>
                <span className="text-sm font-medium truncate">{subject.name}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {subject.masteryScore}%
              </span>
            </div>
            <Progress
              value={subject.masteryScore}
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground">
              {subject.cardCount} cards · avg quality {subject.avgQuality.toFixed(1)}/5
            </p>
          </div>
        ))}
        <Link href="/subjects">
          <Button variant="outline" size="sm" className="w-full mt-2">
            View all subjects
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
