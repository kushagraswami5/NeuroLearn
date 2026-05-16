"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Loader2, FileText, BookOpen, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import type { QuizQuestion } from "@/lib/ai/schemas";
import { saveQuizResultsAction } from "@/app/actions/quiz";

interface Subject {
  id: string;
  name: string;
  emoji: string;
  topics: Array<{ id: string; name: string }>;
}

interface UploadedFile {
  id: string;
  filename: string;
  subject: { name: string } | null;
}

interface QuizGeneratorProps {
  subjects: Subject[];
  files: UploadedFile[];
  userId: string;
}

type SourceType = "file" | "topic" | "text";

export function QuizGenerator({ subjects, files, userId }: QuizGeneratorProps) {
  const [sourceType, setSourceType] = useState<SourceType>("file");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizState, setQuizState] = useState<{
    currentIdx: number;
    answers: Record<string, string>;
    submitted: boolean;
    sessionId: string | null;
  }>({ currentIdx: 0, answers: {}, submitted: false, sessionId: null });

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);
  const topics = selectedSubjectObj?.topics ?? [];

  async function handleGenerate() {
    setIsGenerating(true);
    setQuiz(null);

    try {
      const payload: Record<string, unknown> = { questionCount };
      if (sourceType === "file" && selectedFile) payload.fileId = selectedFile;
      else if (sourceType === "topic" && selectedTopic) payload.topicId = selectedTopic;
      else {
        toast.error("Please select a source to generate from");
        setIsGenerating(false);
        return;
      }
      if (selectedSubject) payload.subjectId = selectedSubject;

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setQuiz(data.quiz.questions);
      setQuizState({ currentIdx: 0, answers: {}, submitted: false, sessionId: null });
      toast.success(`Generated ${data.quiz.questions.length} questions!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAnswer(questionId: string, optionId: string) {
    if (quizState.submitted) return;
    setQuizState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: optionId },
    }));
  }

  async function handleSubmit() {
    if (!quiz) return;
    const allAnswered = quiz.every((q) => quizState.answers[q.id]);
    if (!allAnswered) {
      toast.error("Please answer all questions first");
      return;
    }

    const correctCount = quiz.filter((q) => quizState.answers[q.id] === q.correctId).length;
    const score = Math.round((correctCount / quiz.length) * 100);

    setQuizState((prev) => ({ ...prev, submitted: true }));

    await saveQuizResultsAction({
      subjectId: selectedSubject || undefined,
      questions: quiz,
      answers: quizState.answers,
      score,
      correctCount,
    });
  }

  if (quiz && quizState.submitted) {
    const correctCount = quiz.filter((q) => quizState.answers[q.id] === q.correctId).length;
    const score = Math.round((correctCount / quiz.length) * 100);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Results header */}
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <div className="text-5xl">{score >= 80 ? "🎉" : score >= 60 ? "👍" : "💪"}</div>
            <div className="text-2xl font-bold">{score}%</div>
            <p className="text-muted-foreground">
              {correctCount} / {quiz.length} correct
            </p>
            <Button onClick={() => setQuiz(null)} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Generate New Quiz
            </Button>
          </CardContent>
        </Card>

        {/* Question review */}
        {quiz.map((q, i) => {
          const userAnswer = quizState.answers[q.id];
          const isCorrect = userAnswer === q.correctId;
          return (
            <Card key={q.id} className={isCorrect ? "border-green-500/30" : "border-red-500/30"}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Q{i + 1}: {q.question}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{q.difficulty}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-lg text-sm border ${
                      opt.id === q.correctId
                        ? "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400"
                        : opt.id === userAnswer && !isCorrect
                        ? "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono font-bold mr-2">{opt.id}.</span>
                    {opt.text}
                  </div>
                ))}
                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Explanation</p>
                  <p className="text-sm">{q.explanation}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>
    );
  }

  if (quiz) {
    const current = quiz[quizState.currentIdx];
    const answered = quizState.answers[current.id];
    const totalAnswered = Object.keys(quizState.answers).length;

    return (
      <div className="space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {quizState.currentIdx + 1} of {quiz.length}</span>
          <Badge variant="outline">{current.difficulty}</Badge>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="font-medium leading-relaxed">{current.question}</p>
                <div className="space-y-2">
                  {current.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(current.id, opt.id)}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                        answered === opt.id
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-mono font-bold mr-2">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={() => setQuizState((p) => ({ ...p, currentIdx: Math.max(0, p.currentIdx - 1) }))}
            disabled={quizState.currentIdx === 0}
          >
            Previous
          </Button>
          {quizState.currentIdx < quiz.length - 1 ? (
            <Button
              onClick={() => setQuizState((p) => ({ ...p, currentIdx: p.currentIdx + 1 }))}
              disabled={!answered}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={totalAnswered < quiz.length}
            >
              Submit ({totalAnswered}/{quiz.length})
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quiz Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Source type */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSourceType("file")}
            className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${
              sourceType === "file" ? "border-primary bg-primary/10" : "hover:bg-muted/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            From Uploaded File
          </button>
          <button
            onClick={() => setSourceType("topic")}
            className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${
              sourceType === "topic" ? "border-primary bg-primary/10" : "hover:bg-muted/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            From Topic Cards
          </button>
        </div>

        {sourceType === "file" && (
          <div className="space-y-2">
            <Label>Select File</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an uploaded file..." />
              </SelectTrigger>
              <SelectContent>
                {files.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.filename}
                    {f.subject && <span className="text-muted-foreground ml-2">· {f.subject.name}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {files.length === 0 && (
              <p className="text-xs text-muted-foreground">No ready files found. Upload a PDF first.</p>
            )}
          </div>
        )}

        {sourceType === "topic" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.emoji} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSubject && (
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Question count */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Number of Questions</Label>
            <span className="text-sm font-medium">{questionCount}</span>
          </div>
          <Slider
            value={[questionCount]}
            onValueChange={([v]) => setQuestionCount(v)}
            min={3}
            max={20}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3 (quick)</span>
            <span>20 (thorough)</span>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (sourceType === "file" && !selectedFile) || (sourceType === "topic" && !selectedTopic)}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating with Gemini AI...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
