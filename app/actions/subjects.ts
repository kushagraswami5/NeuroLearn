"use server";

import { z } from "zod";
import { requireUser, createSubject, updateSubject, deleteSubject, createTopic } from "@/lib/dal";
import { trackEvent } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const createSubjectSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  emoji: z.string().max(4).default("📚"),
  examDate: z.date().optional(),
});

export async function createSubjectAction(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = createSubjectSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid data: " + parsed.error.errors[0]?.message };
    }

    const subject = await createSubject(user.id, parsed.data);
    await trackEvent(user.id, "subject.created", { subjectId: subject.id });
    revalidatePath("/subjects");
    return { data: subject };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create subject" };
  }
}

const updateSubjectSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  emoji: z.string().max(4).optional(),
  examDate: z.date().nullable().optional(),
});

export async function updateSubjectAction(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = updateSubjectSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid data: " + parsed.error.errors[0]?.message };
    }

    const { id, ...rest } = parsed.data;
    const subject = await updateSubject(id, user.id, rest as Parameters<typeof updateSubject>[2]);
    revalidatePath("/subjects");
    revalidatePath(`/subjects/${id}`);
    return { data: subject };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update subject" };
  }
}

export async function deleteSubjectAction(id: string) {
  try {
    const user = await requireUser();
    if (!id || typeof id !== "string") return { error: "Invalid id" };
    await deleteSubject(id, user.id);
    revalidatePath("/subjects");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete subject" };
  }
}

const createTopicSchema = z.object({
  subjectId: z.string().cuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
});

export async function createTopicAction(data: unknown) {
  try {
    const user = await requireUser();
    const parsed = createTopicSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid data: " + parsed.error.errors[0]?.message };
    }

    const topic = await createTopic(parsed.data.subjectId, user.id, {
      name: parsed.data.name,
      description: parsed.data.description,
    });
    revalidatePath(`/subjects/${parsed.data.subjectId}`);
    return { data: topic };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create topic" };
  }
}
