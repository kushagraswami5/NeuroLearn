"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  emoji: string;
  topics: { id: string; name: string }[];
}

interface FileUploaderProps {
  subjects: Subject[];
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown"];
const ALLOWED_EXTS = [".pdf", ".txt", ".md"];

export function FileUploader({ subjects }: FileUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("none");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  function validateFile(file: File): string | null {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Max ${MAX_SIZE_MB}MB.`;
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload PDF, TXT, or MD files.";
    }
    return null;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setSelectedFile(file);
    setUploadState("idle");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setSelectedFile(file);
    setUploadState("idle");
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploadState("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (selectedSubjectId !== "none") formData.append("subjectId", selectedSubjectId);
    if (selectedTopicId !== "none") formData.append("topicId", selectedTopicId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Upload failed");
      }

      setUploadState("done");
      toast.success("File uploaded! Processing and embedding in background...");
      setSelectedFile(null);
      setSelectedSubjectId("none");
      setSelectedTopicId("none");
      setTimeout(() => {
        setUploadState("idle");
        router.refresh();
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
      setUploadState("error");
      toast.error(msg);
    }
  }, [selectedFile, selectedSubjectId, selectedTopicId, router]);

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !selectedFile && inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : selectedFile
              ? "border-green-500/50 bg-green-500/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={handleFileSelect}
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-green-500" />
              <div className="text-left">
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 ml-2"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadState("idle"); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, TXT, MD · Max {MAX_SIZE_MB}MB
              </p>
              <div className="flex justify-center gap-1.5 mt-2">
                {[".pdf", ".txt", ".md"].map((ext) => (
                  <Badge key={ext} variant="secondary" className="text-xs">{ext}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        {selectedFile && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Link to subject (optional)</Label>
              <Select
                value={selectedSubjectId}
                onValueChange={(v) => { setSelectedSubjectId(v); setSelectedTopicId("none"); }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSubject && selectedSubject.topics.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Link to topic (optional)</Label>
                <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="No topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No topic</SelectItem>
                    {selectedSubject.topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Status feedback */}
        {uploadState === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}
        {uploadState === "done" && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Upload successful! Embedding in background...
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploadState === "uploading" || uploadState === "done"}
          className="w-full"
        >
          {uploadState === "uploading" ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />Upload & Process</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
