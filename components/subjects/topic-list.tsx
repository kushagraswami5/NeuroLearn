"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, BookOpen, Plus } from "lucide-react";
import { CardList } from "@/components/cards/card-list";
import { CreateCardButton } from "@/components/cards/create-card-button";
import type { Topic, Card as PrismaCard } from "@prisma/client";

type TopicWithCards = Topic & {
  cards: PrismaCard[];
  _count: { cards: number };
};

interface TopicListProps {
  topics: TopicWithCards[];
  subjectId: string;
  subjectColor: string;
}

export function TopicList({ topics, subjectId, subjectColor }: TopicListProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  if (topics.length === 0) {
    return (
      <div className="text-center py-16 border rounded-xl border-dashed">
        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">No topics yet</p>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first topic to start adding cards.
        </p>
      </div>
    );
  }

  function toggleTopic(topicId: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => {
        const isExpanded = expandedTopics.has(topic.id);
        const dueCards = topic.cards.filter((c) => new Date(c.dueAt) <= new Date()).length;

        return (
          <Card key={topic.id} className="overflow-hidden">
            <CardHeader
              className="py-3 px-4 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => toggleTopic(topic.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: subjectColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{topic.name}</span>
                    {dueCards > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {dueCards} due
                      </Badge>
                    )}
                  </div>
                  {topic.description && (
                    <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{topic._count.cards} cards</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4 space-y-3">
                <div className="flex justify-end gap-2">
                  <Link href={`/quiz/new?topicId=${topic.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      Generate Quiz
                    </Button>
                  </Link>
                  <CreateCardButton topicId={topic.id} />
                </div>
                <CardList cards={topic.cards} />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
