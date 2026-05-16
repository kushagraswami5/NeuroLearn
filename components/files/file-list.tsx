"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: Date;
  errorMsg: string | null;
  subject: { name: string; emoji: string } | null;
  topic: { name: string } | null;
  _count: { chunks: number };
}

interface FileListProps {
  files: UploadedFile[];
}

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: Clock, variant: "secondary" as const },
  PROCESSING: { label: "Processing", icon: Loader2, variant: "secondary" as const, animate: true },
  READY: { label: "Ready", icon: CheckCircle2, variant: "default" as const },
  FAILED: { label: "Failed", icon: AlertCircle, variant: "destructive" as const },
};

export function FileList({ files }: FileListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/upload?fileId=${fileId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Delete failed");
      toast.success("File deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed rounded-xl">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">No files uploaded yet</p>
        <p className="text-sm text-muted-foreground">
          Upload a PDF or notes file above to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Uploaded Files ({files.length})
        </h2>
        {files.map((file) => {
          const status = STATUS_CONFIG[file.status];
          const Icon = status.icon;
          const isDeleting = deletingId === file.id;

          return (
            <Card key={file.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{file.filename}</p>
                      <Badge variant={status.variant} className="text-xs gap-1 shrink-0">
                        <Icon className={`w-3 h-3 ${"animate" in status && status.animate ? "animate-spin" : ""}`} />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
                      {file.subject && (
                        <span className="text-xs text-muted-foreground">
                          · {file.subject.emoji} {file.subject.name}
                          {file.topic && ` / ${file.topic.name}`}
                        </span>
                      )}
                      {file.status === "READY" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          · <Zap className="w-2.5 h-2.5" />
                          {file._count.chunks} chunks embedded
                        </span>
                      )}
                      {file.status === "FAILED" && file.errorMsg && (
                        <span className="text-xs text-destructive">· {file.errorMsg}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        · {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {file.status === "READY" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => router.push(`/quiz/new?fileId=${file.id}`)}
                      >
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Quiz
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDeleteId(file.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={() => setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file and all its embeddings. The AI tutor
              will no longer have access to this content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
