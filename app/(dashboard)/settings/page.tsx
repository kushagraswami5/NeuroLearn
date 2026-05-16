import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      streakDays: true,
      totalXp: true,
      createdAt: true,
    },
  });

  if (!userRecord) throw new Error("User not found");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>
      <SettingsForm user={userRecord} />
    </div>
  );
}
