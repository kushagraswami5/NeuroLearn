import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Target, Zap, MessageSquare, Upload } from "lucide-react";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/revision">
        <Button variant="default" size="sm" className="gap-2">
          <Target className="w-4 h-4" />
          Start Review
        </Button>
      </Link>
      <Link href="/quiz/new">
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="w-4 h-4" />
          Generate Quiz
        </Button>
      </Link>
      <Link href="/tutor">
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Ask AI Tutor
        </Button>
      </Link>
      <Link href="/files">
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Notes
        </Button>
      </Link>
    </div>
  );
}
