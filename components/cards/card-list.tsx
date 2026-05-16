"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { Card as PrismaCard } from "@prisma/client";

interface CardListProps {
  cards: PrismaCard[];
}

const INITIAL_SHOW = 5;

export function CardList({ cards }: CardListProps) {
  const [showAll, setShowAll] = useState(false);

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
        No cards yet. Create your first card or generate from a quiz.
      </p>
    );
  }

  const visible = showAll ? cards : cards.slice(0, INITIAL_SHOW);

  return (
    <div className="space-y-2">
      {visible.map((card) => {
        const isWeak = card.easeFactor < 1.7;
        const isDue = new Date(card.dueAt) <= new Date();

        return (
          <div
            key={card.id}
            className="flex gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            {isWeak && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{card.front}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{card.back}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isDue && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Due
                </Badge>
              )}
              <Badge
                variant={isWeak ? "destructive" : "outline"}
                className="text-xs px-1.5 py-0"
              >
                EF {card.easeFactor.toFixed(1)}
              </Badge>
            </div>
          </div>
        );
      })}

      {cards.length > INITIAL_SHOW && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-7"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              Show {cards.length - INITIAL_SHOW} more cards
            </>
          )}
        </Button>
      )}
    </div>
  );
}
