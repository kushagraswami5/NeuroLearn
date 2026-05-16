import { requireUser, getDueCards } from "@/lib/dal";
import { RevisionClient } from "@/components/revision/revision-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Revision" };

export default async function RevisionPage() {
  const user = await requireUser();
  const dueCards = await getDueCards(user.id, 50);

  if (dueCards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">All caught up!</h1>
        <p className="text-muted-foreground mb-6">
          No cards are due for review right now. Great work! Come back later or
          create more cards to study.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/subjects">
            <Button variant="outline">Browse Subjects</Button>
          </Link>
          <Link href="/quiz/new">
            <Button>Generate Quiz</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Review Session
          </h1>
          <p className="text-muted-foreground mt-1">
            {dueCards.length} card{dueCards.length !== 1 ? "s" : ""} due for review
          </p>
        </div>
      </div>

      <RevisionClient cards={dueCards as any} userId={user.id} mode="NORMAL" />
    </div>
  );
}
