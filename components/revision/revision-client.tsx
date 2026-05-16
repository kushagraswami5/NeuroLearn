"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Zap,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { reviewCardAction, completeRevisionSessionAction, startRevisionSessionAction } from "@/app/actions/cards";

interface ReviewCard {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
  easeFactor: number;
  repetitions: number;
  topic: {
    name: string;
    subject: { name: string; color: string; emoji: string };
  };
}

interface RevisionClientProps {
  cards: ReviewCard[];
  userId: string;
  mode: "NORMAL" | "EMERGENCY" | "EXAM_PREP";
  timeLimitSec?: number;
}

const QUALITY_BUTTONS = [
  { quality: 0, label: "Blackout", sublabel: "No clue", color: "bg-red-600 hover:bg-red-700 text-white", emoji: "😵" },
  { quality: 2, label: "Wrong", sublabel: "Knew after", color: "bg-orange-500 hover:bg-orange-600 text-white", emoji: "😕" },
  { quality: 3, label: "Hard", sublabel: "Correct", color: "bg-yellow-500 hover:bg-yellow-600 text-white", emoji: "😅" },
  { quality: 4, label: "Good", sublabel: "Easy recall", color: "bg-green-500 hover:bg-green-600 text-white", emoji: "😊" },
  { quality: 5, label: "Perfect", sublabel: "Instant", color: "bg-emerald-600 hover:bg-emerald-700 text-white", emoji: "🎯" },
];

export function RevisionClient({ cards, userId, mode, timeLimitSec }: RevisionClientProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? null);
  const [results, setResults] = useState<Array<{ quality: number; wasCorrect: boolean }>>([]);
  const [lastXP, setLastXP] = useState<{ xpEarned: number; newStreak: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = Math.round((currentIndex / cards.length) * 100);

  // Initialize session
  useEffect(() => {
    startRevisionSessionAction(mode).then((res) => {
      if (res.data) setSessionId(res.data.id);
    });
  }, [mode]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isComplete) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(t);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, isComplete]);

  const handleFlip = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleQuality = useCallback(async (quality: number) => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);

    const timeTaken = Date.now() - startTime;
    const wasCorrect = quality >= 3;

    const result = await reviewCardAction({
      cardId: currentCard.id,
      quality,
      sessionId,
      timeTakenMs: timeTaken,
    });

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    setResults((prev) => [...prev, { quality, wasCorrect }]);

    if (currentIndex + 1 >= cards.length) {
      await handleSessionComplete([...results, { quality, wasCorrect }]);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
      setStartTime(Date.now());
      setIsSubmitting(false);
    }
  }, [sessionId, currentCard, currentIndex, cards.length, results, startTime, isSubmitting]);

  const handleSessionComplete = useCallback(async (finalResults?: typeof results) => {
    const allResults = finalResults ?? results;
    const res = await completeRevisionSessionAction({
      sessionId: sessionId!,
      attempts: allResults,
    });

    if (res.data) {
      setLastXP(res.data);
    }
    setIsComplete(true);
    setIsSubmitting(false);
  }, [sessionId, results]);

  // Session complete screen
  if (isComplete) {
    const correctCount = results.filter((r) => r.wasCorrect).length;
    const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="text-6xl">
          {accuracy >= 80 ? "🎉" : accuracy >= 60 ? "👍" : "💪"}
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-muted-foreground">You reviewed {results.length} cards</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-500">{correctCount}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-primary">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">+{lastXP?.xpEarned ?? 0}</div>
              <div className="text-xs text-muted-foreground">XP Earned</div>
            </CardContent>
          </Card>
        </div>

        {lastXP && lastXP.newStreak > 1 && (
          <div className="flex items-center justify-center gap-2 text-orange-500 font-semibold">
            <Zap className="w-5 h-5" />
            {lastXP.newStreak} day streak! 🔥
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
          <Button onClick={() => router.refresh()}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Review More
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>{currentCard.topic.subject.emoji}</span>
          <span className="text-muted-foreground">
            {currentCard.topic.subject.name} · {currentCard.topic.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <Badge variant={timeLeft <= 60 ? "destructive" : "secondary"}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </Badge>
          )}
          <span className="text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Flashcard */}
      <div className="card-flip min-h-[280px] cursor-pointer" onClick={!isFlipped ? handleFlip : undefined}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard.id}-${isFlipped ? "back" : "front"}`}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 0 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.25 }}
          >
            <Card
              className={`min-h-[280px] flex flex-col justify-center ${
                !isFlipped ? "cursor-pointer hover:shadow-md transition-shadow" : ""
              }`}
            >
              <CardContent className="p-8 text-center space-y-4">
                {!isFlipped ? (
                  <>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Question</p>
                    <p className="text-lg font-medium leading-relaxed">{currentCard.front}</p>
                    {currentCard.hint && (
                      <p className="text-sm text-muted-foreground italic">
                        💡 Hint: {currentCard.hint}
                      </p>
                    )}
                    <Button variant="outline" size="sm" className="mt-4">
                      Reveal Answer
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Answer</p>
                    <p className="text-lg font-medium leading-relaxed">{currentCard.back}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quality buttons — only shown after flip */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-sm text-center text-muted-foreground font-medium">
              How well did you recall this?
            </p>
            <div className="grid grid-cols-5 gap-2">
              {QUALITY_BUTTONS.map((btn) => (
                <button
                  key={btn.quality}
                  onClick={() => handleQuality(btn.quality)}
                  disabled={isSubmitting}
                  className={`${btn.color} rounded-xl p-2 text-center transition-all active:scale-95 disabled:opacity-50`}
                >
                  <div className="text-lg">{btn.emoji}</div>
                  <div className="text-xs font-semibold mt-0.5">{btn.label}</div>
                  <div className="text-xs opacity-75">{btn.sublabel}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card metadata */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span>EF: {currentCard.easeFactor.toFixed(2)}</span>
        <span>Reps: {currentCard.repetitions}</span>
        <Badge variant={currentCard.easeFactor < 1.7 ? "destructive" : "outline"} className="text-xs">
          {currentCard.easeFactor < 1.7 ? "Weak" : currentCard.easeFactor >= 2.0 ? "Strong" : "Learning"}
        </Badge>
      </div>
    </div>
  );
}
