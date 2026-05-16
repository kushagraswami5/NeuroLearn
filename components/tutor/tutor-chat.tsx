"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Send, Loader2, Trash2, User, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clearChatAction } from "@/app/actions/tutor";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ filename: string; similarity: number }> | null;
  createdAt?: Date;
}

interface Subject {
  id: string;
  name: string;
  emoji: string;
}

interface TutorChatProps {
  initialMessages: Message[];
  subjects: Subject[];
  userId: string;
}

export function TutorChat({ initialMessages, subjects, userId }: TutorChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("none");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add placeholder assistant message for streaming
    const assistantId = `stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date() },
    ]);

    try {
      const subjectName =
        selectedSubject !== "none"
          ? subjects.find((s) => s.id === selectedSubject)?.name
          : undefined;

      const conversationHistory = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ].slice(-20); // Keep last 20 messages for context window

      const response = await fetch("/api/tutor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory, subjectName }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(err.error ?? "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let citations: Message["citations"] = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE-style data
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              if (data.startsWith("[CITATIONS]")) {
                try {
                  citations = JSON.parse(data.slice(11));
                } catch {}
                continue;
              }
              fullContent += data;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            }
          }
        }
      }

      // Finalize with citations
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: fullContent, citations } : m
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get AI response");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [input, isLoading, messages, selectedSubject, subjects]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    const result = await clearChatAction();
    if (result.error) {
      toast.error(result.error);
    } else {
      setMessages([]);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Brain className="w-5 h-5 text-primary shrink-0" />
        <h1 className="font-semibold flex-1">AI Tutor</h1>

        {subjects.length > 0 && (
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Subject context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No subject</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClear}
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">Your AI Tutor is ready</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ask anything about your subjects. I'll search your uploaded notes for context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {["Explain photosynthesis", "What is gradient descent?", "Summarise my notes on WW2"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs border rounded-full px-3 py-1.5 hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                <AvatarFallback className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                  {message.role === "user" ? <User className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
                </AvatarFallback>
              </Avatar>

              <div className={`max-w-[80%] space-y-1.5 ${message.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    message.content ? (
                      <div className="prose-tutor">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {message.citations.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        {c.filename} · {Math.round(c.similarity * 100)}%
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your tutor anything... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="resize-none min-h-[42px] max-h-32"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Grounded in your uploaded notes · Powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  );
}
