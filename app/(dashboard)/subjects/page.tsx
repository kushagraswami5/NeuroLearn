import { requireUser, getSubjects } from "@/lib/dal";
import { SubjectCard } from "@/components/subjects/subject-card";
import { CreateSubjectButton } from "@/components/subjects/create-subject-button";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireUser();
  const subjects = await getSubjects(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your learning subjects and topics.
          </p>
        </div>
        <CreateSubjectButton />
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No subjects yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first subject to start organising your learning.
          </p>
          <CreateSubjectButton />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
