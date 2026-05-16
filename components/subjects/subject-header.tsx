"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Pencil, Trash2, Zap, Calendar, ArrowLeft } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { deleteSubjectAction } from "@/app/actions/subjects";

interface SubjectHeaderProps {
  subject: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    emoji: string;
    examDate: Date | null;
    cardCount: number;
    masteryPct: number;
    _count: { topics: number };
  };
}

export function SubjectHeader({ subject }: SubjectHeaderProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const daysUntilExam = subject.examDate
    ? differenceInDays(new Date(subject.examDate), new Date())
    : null;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSubjectAction(subject.id);
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
    } else {
      toast.success("Subject deleted");
      router.push("/subjects");
    }
  }

  return (
    <>
      <div
        className="rounded-xl border p-6"
        style={{ background: `linear-gradient(135deg, ${subject.color}15, transparent)`, borderColor: `${subject.color}30` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/subjects">
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ backgroundColor: `${subject.color}20`, border: `1px solid ${subject.color}40` }}
            >
              {subject.emoji}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{subject.name}</h1>
              {subject.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {subject.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {subject._count.topics} topics · {subject.cardCount} cards
                </span>
                {subject.examDate && daysUntilExam !== null && daysUntilExam >= 0 && (
                  <Badge variant={daysUntilExam <= 7 ? "destructive" : "secondary"} className="text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {daysUntilExam === 0 ? "Exam today!" : `${daysUntilExam}d until exam`}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/revision/emergency?subject=${subject.id}`}>
              <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                Emergency
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit subject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete subject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mastery bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mastery</span>
            <span className="font-medium">{subject.masteryPct}%</span>
          </div>
          <Progress value={subject.masteryPct} className="h-2" />
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{subject.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this subject, all its topics, cards, and uploaded files.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
