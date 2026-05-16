"use server";

import { requireUser, clearChatHistory } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function clearChatAction() {
  try {
    const user = await requireUser();
    await clearChatHistory(user.id);
    revalidatePath("/tutor");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to clear chat" };
  }
}
