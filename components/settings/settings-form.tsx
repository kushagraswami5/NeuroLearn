"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import { format } from "date-fns";
import { LogOut, Shield, Star, Flame, Trophy } from "lucide-react";

interface SettingsFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    plan: string;
    streakDays: number;
    totalXp: number;
    createdAt: Date;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{user.name ?? "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Member since {format(new Date(user.createdAt), "MMMM yyyy")}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="font-bold text-lg">{user.streakDays}</span>
              </div>
              <p className="text-xs text-muted-foreground">Day streak</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-yellow-500">
                <Trophy className="w-4 h-4" />
                <span className="font-bold text-lg">{user.totalXp.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Star className="w-4 h-4" />
                <span className="font-bold text-lg capitalize">{user.plan.toLowerCase()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Plan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Plan & Billing
          </CardTitle>
          <CardDescription>Your current plan and usage limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <p className="font-medium capitalize">{user.plan.toLowerCase()} Plan</p>
              <p className="text-xs text-muted-foreground">
                {user.plan === "FREE"
                  ? "5 file uploads · 50 quiz generations / month"
                  : "Unlimited uploads & generations"}
              </p>
            </div>
            <Badge variant={user.plan === "FREE" ? "secondary" : "default"}>
              {user.plan}
            </Badge>
          </div>
          {user.plan === "FREE" && (
            <Button className="w-full" variant="outline">
              <Star className="w-4 h-4 mr-2" />
              Upgrade to Pro — coming soon
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/5"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
