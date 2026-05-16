import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Subject, Topic } from "@prisma/client";

type SubjectWithTopics = Subject & {
  topics: (Topic & { _count: { cards: number } })[];
  _count: { topics: number };
};

interface SubjectCardProps {
  subject: SubjectWithTopics;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const totalCards = subject.topics.reduce(
    (sum, t) => sum + t._count.cards,
    0
  );
  const daysUntilExam = subject.examDate
    ? differenceInDays(new Date(subject.examDate), new Date())
    : null;

  return (
    <Link href={`/subjects/${subject.id}`}>
      <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `${subject.color}20`, border: `1px solid ${subject.color}40` }}
              >
                {subject.emoji}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{subject.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {subject._count.topics} topic{subject._count.topics !== 1 ? "s" : ""} ·{" "}
                  {totalCards} card{totalCards !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {subject.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {subject.description}
            </p>
          )}

          {/* Mastery progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Mastery</span>
              <span className="font-medium">{Math.round(subject.masteryPct)}%</span>
            </div>
            <Progress value={subject.masteryPct} className="h-1.5" />
          </div>

          {/* Exam countdown */}
          {daysUntilExam !== null && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <Badge
                variant={daysUntilExam <= 3 ? "destructive" : daysUntilExam <= 7 ? "default" : "secondary"}
                className="text-xs"
              >
                {daysUntilExam <= 0
                  ? "Exam today!"
                  : `${daysUntilExam}d until exam`}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
