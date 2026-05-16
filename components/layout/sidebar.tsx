"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
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

interface SidebarProps {
  user: { id: string; email: string; name?: string | null; image?: string | null };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full py-4 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <Brain className="w-7 h-7 text-primary shrink-0" />
        <span className="font-bold text-lg">NeuroLearn</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Emergency Revision */}
      <div className="px-3 mb-4">
        <Link href="/revision/emergency">
          <Button variant="destructive" size="sm" className="w-full">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Emergency Revision
          </Button>
        </Link>
      </div>

      {/* User area */}
      <div className="border-t pt-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-7 h-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
