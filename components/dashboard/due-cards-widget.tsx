import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Card as PrismaCard, Topic, Subject } from "@prisma/client";

type DueCard = PrismaCard & {
  topic: Topic & {
    subject: Pick<Subject, "name" | "color" | "emoji">;
  };
};

interface DueCardsWidgetProps {
  cards: DueCard[];
}

export function DueCardsWidget({ cards }: DueCardsWidgetProps) {
  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
          <p className="text-muted-foreground text-sm mb-4">
            No cards due for review right now. Check back later.
          </p>
          <Link href="/subjects">
            <Button variant="outline" size="sm">
              Browse subjects
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Due for Review
              <Badge variant="secondary">{cards.length}</Badge>
            </CardTitle>
            <CardDescription>Cards that need your attention today</CardDescription>
          </div>
          <Link href="/revision">
            <Button size="sm">
              Start Review
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {cards.slice(0, 5).map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <span className="text-lg">{card.topic.subject.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card.front}</p>
                <p className="text-xs text-muted-foreground">
                  {card.topic.subject.name} · {card.topic.name}
                </p>
              </div>
              <Badge
                variant={card.easeFactor < 1.7 ? "destructive" : "secondary"}
                className="shrink-0 text-xs"
              >
                EF {card.easeFactor.toFixed(1)}
              </Badge>
            </div>
          ))}
          {cards.length > 5 && (
            <p className="text-xs text-center text-muted-foreground pt-1">
              +{cards.length - 5} more cards due
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
