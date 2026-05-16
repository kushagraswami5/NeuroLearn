import { requireUser, getChatHistory } from "@/lib/dal";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { getSubjects } from "@/lib/dal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI Tutor" };

export default async function TutorPage() {
  const user = await requireUser();
  const [history, subjects] = await Promise.all([
    getChatHistory(user.id, 30),
    getSubjects(user.id),
  ]);

  // Convert DB messages to chat format
  const initialMessages = history.map((msg) => ({
    id: msg.id,
    role: msg.role.toLowerCase() as "user" | "assistant",
    content: msg.content,
    citations: msg.citations as Array<{ filename: string; similarity: number }> | null,
    createdAt: msg.createdAt,
  }));

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] flex flex-col">
      <TutorChat
        initialMessages={initialMessages}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))}
        userId={user.id}
      />
    </div>
  );
}
