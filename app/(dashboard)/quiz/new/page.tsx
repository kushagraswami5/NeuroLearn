import { requireUser, getSubjects } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { QuizGenerator } from "@/components/quiz/quiz-generator";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Generate Quiz" };

interface Props {
  searchParams: Promise<{
    topicId?: string;
    subjectId?: string;
  }>;
}

export default async function QuizNewPage({ searchParams }: Props) {
  const params = await searchParams;

  const user = await requireUser();

  const [subjects, files] = await Promise.all([
    getSubjects(user.id),
    prisma.uploadedFile.findMany({
      where: { userId: user.id, status: "READY" },
      select: {
        id: true,
        filename: true,
        subject: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Generate Quiz
        </h1>

        <p className="text-muted-foreground mt-1">
          Create an AI-powered quiz from your notes or topics.
        </p>
      </div>

      <QuizGenerator
        subjects={subjects as any}
        files={files}
        userId={user.id}
        defaultTopicId={params.topicId}
        defaultSubjectId={params.subjectId}
      />
    </div>
  );
}