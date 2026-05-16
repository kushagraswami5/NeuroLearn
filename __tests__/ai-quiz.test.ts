import { describe, it, expect, vi } from "vitest";
import { chunkText, selectBestChunks, validateExtractedText } from "@/lib/ai/quiz";
import { sanitizeAIOutput, estimateTokens, truncateToTokenBudget } from "@/lib/ai/fallback";

describe("chunkText", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText("")).toHaveLength(0);
  });

  it("returns single chunk for short text", () => {
    const text = "This is a short paragraph about biology.";
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].text).toContain("biology");
  });

  it("returns multiple chunks for long text", () => {
    const text = "word ".repeat(1000);
    const chunks = chunkText(text, 200, 20);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("assigns sequential indices", () => {
    const text = "word ".repeat(1000);
    const chunks = chunkText(text, 200, 20);
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it("respects chunk size limit approximately", () => {
    const text = "word ".repeat(2000);
    const chunkSize = 500;
    const chunks = chunkText(text, chunkSize, 50);
    chunks.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(chunkSize + 50); // +tolerance for sentence break
    });
  });

  it("strips null bytes and control chars", () => {
    const text = "Hello\x00World\x01test";
    const chunks = chunkText(text);
    chunks.forEach((c) => {
      expect(c.text).not.toContain("\x00");
    });
  });

  it("includes token estimate", () => {
    const text = "word ".repeat(100);
    const chunks = chunkText(text);
    expect(chunks[0].tokenEstimate).toBeGreaterThan(0);
  });
});

describe("selectBestChunks", () => {
  it("returns empty string for empty chunks", () => {
    expect(selectBestChunks([])).toBe("");
  });

  it("respects token budget", () => {
    const chunks = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      text: "word ".repeat(100),
      tokenEstimate: 100,
    }));
    const result = selectBestChunks(chunks, 300);
    // Should return at most 3 chunks worth of content
    const wordCount = result.split(" ").length;
    expect(wordCount).toBeLessThanOrEqual(350); // some tolerance for separators
  });

  it("returns all chunks if within budget", () => {
    const chunks = [
      { index: 0, text: "First chunk content about photosynthesis.", tokenEstimate: 10 },
      { index: 1, text: "Second chunk about respiration.", tokenEstimate: 8 },
    ];
    const result = selectBestChunks(chunks, 1000);
    expect(result).toContain("photosynthesis");
    expect(result).toContain("respiration");
  });
});

describe("validateExtractedText", () => {
  it("rejects text that is too short", () => {
    const result = validateExtractedText("short");
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("accepts normal English text", () => {
    const text = "This is a normal paragraph about cell biology. Cells are the basic unit of life. They contain organelles like mitochondria and chloroplasts.".repeat(3);
    const result = validateExtractedText(text);
    expect(result.valid).toBe(true);
  });

  it("rejects garbled binary-like text", () => {
    const text = "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89".repeat(50);
    const result = validateExtractedText(text);
    expect(result.valid).toBe(false);
  });
});

describe("sanitizeAIOutput", () => {
  it("removes script tags", () => {
    const input = 'Hello <script>alert("xss")</script> world';
    expect(sanitizeAIOutput(input)).not.toContain("<script>");
  });

  it("removes javascript: protocol", () => {
    const input = "Click javascript:alert(1) here";
    expect(sanitizeAIOutput(input)).not.toContain("javascript:");
  });

  it("removes injection markers", () => {
    const input = "Normal text [SYSTEM] override instructions [INST] hack";
    const result = sanitizeAIOutput(input);
    expect(result).not.toContain("[SYSTEM]");
    expect(result).not.toContain("[INST]");
  });

  it("preserves normal text", () => {
    const input = "This is a perfectly normal AI response about photosynthesis.";
    expect(sanitizeAIOutput(input)).toBe(input);
  });
});

describe("estimateTokens", () => {
  it("estimates tokens as roughly text_length / 4", () => {
    const text = "a".repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });

  it("rounds up", () => {
    expect(estimateTokens("abc")).toBe(1); // ceil(3/4) = 1
  });
});

describe("truncateToTokenBudget", () => {
  it("returns text unchanged if within budget", () => {
    const text = "short text";
    expect(truncateToTokenBudget(text, 1000)).toBe(text);
  });

  it("truncates and adds marker when over budget", () => {
    const text = "word ".repeat(5000);
    const result = truncateToTokenBudget(text, 10); // 10 tokens = 40 chars
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain("truncated");
  });
});
