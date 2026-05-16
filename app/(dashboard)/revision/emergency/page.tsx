import { requireUser, getWeakCards } from "@/lib/dal";
import { RevisionClient } from "@/components/revision/revision-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Emergency Revision" };

export default async function EmergencyRevisionPage({
  searchParams,
}: {
  searchParams: { exam?: string; minutes?: string };
}) {
  const user = await requireUser();
  const weakCards = await getWeakCards(user.id, 30);

  const examName = searchParams.exam;
  const timeLimitSec = searchParams.minutes ? parseInt(searchParams.minutes) * 60 : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/revision">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-red-500">
              ⚡ Emergency Revision
            </h1>
            {timeLimitSec && (
              <Badge variant="destructive">
                {Math.floor(timeLimitSec / 60)} min limit
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {examName ? `Cramming for: ${examName} · ` : ""}
            {weakCards.length} weak cards prioritised
          </p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-600">Emergency Mode Active</p>
            <p className="text-muted-foreground mt-0.5">
              Showing your weakest cards first (lowest ease factor). Focus on understanding,
              not just memorising. Review the answer carefully each time.
            </p>
          </div>
        </div>
      </div>

      {weakCards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-semibold mb-2">No weak cards found!</p>
          <p className="text-muted-foreground mb-4">
            Your cards are all in good shape. Great work!
          </p>
          <Link href="/revision">
            <Button>Normal Revision</Button>
          </Link>
        </div>
      ) : (
        <RevisionClient
          cards={weakCards as any}
          userId={user.id}
          mode="EMERGENCY"
          timeLimitSec={timeLimitSec}
        />
      )}
    </div>
  );
}
