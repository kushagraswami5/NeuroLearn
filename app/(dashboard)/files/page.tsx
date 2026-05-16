import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { FileUploader } from "@/components/files/file-uploader";
import { FileList } from "@/components/files/file-list";
import { getSubjects } from "@/lib/dal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage() {
  const user = await requireUser();

  const [files, subjects] = await Promise.all([
    prisma.uploadedFile.findMany({
      where: { userId: user.id },
      include: {
        subject: { select: { name: true, emoji: true } },
        topic: { select: { name: true } },
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getSubjects(user.id),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Files</h1>
        <p className="text-muted-foreground mt-1">
          Upload PDFs, notes, or markdown files. AI will extract and embed them for quiz generation and tutor context.
        </p>
      </div>

      <FileUploader
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji,
          topics: s.topics.map((t) => ({ id: t.id, name: t.name })),
        }))}
      />

      <FileList files={files as any} />
    </div>
  );
}
