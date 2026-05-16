"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Menu,
  Brain,
  LayoutDashboard,
  BookOpen,
  Zap,
  MessageSquare,
  BarChart3,
  Upload,
  Settings,
  LogOut,
  Target,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/revision", label: "Revision", icon: Target },
  { href: "/quiz", label: "Quiz", icon: Zap },
  { href: "/tutor", label: "AI Tutor", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/files", label: "Files", icon: Upload },
];

interface MobileNavProps {
  user: { id: string; email: string; name?: string | null; image?: string | null };
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between px-4 h-14">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Brain className="w-6 h-6 text-primary" />
        <span className="font-bold">NeuroLearn</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full py-4 px-3">
            <div className="flex items-center gap-2 px-3 mb-6">
              <Brain className="w-7 h-7 text-primary" />
              <span className="font-bold text-lg">NeuroLearn</span>
            </div>

            <nav className="flex-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 mb-4">
              <Link href="/revision/emergency" onClick={() => setOpen(false)}>
                <Button variant="destructive" size="sm" className="w-full">
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  Emergency Revision
                </Button>
              </Link>
            </div>

            <div className="border-t pt-4 px-3 space-y-2">
              <div className="flex items-center gap-3 py-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
