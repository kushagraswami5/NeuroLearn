import { requireUser, getSubjectById } from "@/lib/dal";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubjectHeader } from "@/components/subjects/subject-header";
import { TopicList } from "@/components/subjects/topic-list";
import { CreateTopicButton } from "@/components/subjects/create-topic-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

interface Props {
  params: Promise<{
    subjectId: string;
  }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const resolvedParams = await params;

  return {
    title: `Subject`,
  };
}

async function SubjectContent({
  subjectId,
  userId,
}: {
  subjectId: string;
  userId: string;
}) {
  let subject;

  try {
    subject = await getSubjectById(subjectId, userId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SubjectHeader subject={subject} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Topics
        </h2>

        <CreateTopicButton subjectId={subjectId} />
      </div>

      <TopicList
        topics={subject.topics}
        subjectId={subjectId}
        subjectColor={subject.color}
      />
    </div>
  );
}

export default async function SubjectPage({
  params,
}: Props) {
  const resolvedParams = await params;

  const user = await requireUser();

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-xl" />

          <Skeleton className="h-8 w-40" />

          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-24 rounded-xl"
              />
            ))}
          </div>
        </div>
      }
    >
      <SubjectContent
        subjectId={resolvedParams.subjectId}
        userId={user.id}
      />
    </Suspense>
  );
}
