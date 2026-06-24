import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAnthropicArticleGenerator } from "../providers/article-anthropic";
import { createOpenAIArticleGenerator } from "../providers/article-openai";
import { createGoogleArticleGenerator } from "../providers/article-google";
import { ARTICLE_PROMPT_HAL, ARTICLE_PROMPT_ROI } from "../personas";

// Vercel AI SDK をモック
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-anthropic-model"),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-openai-model"),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-google-model"),
}));

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

const mockGenerateText = vi.mocked(generateText);
const mockAnthropic = vi.mocked(anthropic);
const mockOpenai = vi.mocked(openai);
const mockGoogle = vi.mocked(google);

// 共通のモックレスポンス生成
function createMockResponse(text: string) {
  return {
    text,
    // 最小限の型互換性
    usage: { inputTokens: 100, outputTokens: 200 },
    finishReason: "stop" as const,
    response: {
      id: "test",
      timestamp: new Date(),
      modelId: "test-model",
      messages: [],
    },
    request: {},
    rawResponse: {},
    warnings: [],
    providerMetadata: undefined,
    experimental_providerMetadata: undefined,
    steps: [],
    logprobs: undefined,
    reasoning: undefined,
    reasoningDetails: [],
    files: [],
    sources: [],
    toolCalls: [],
    toolResults: [],
  };
}

describe("createAnthropicArticleGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ハルペルソナで正しいプロンプトを使用する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("# 生成されたタイトル\n\n本文です。") as never,
    );

    const generator = createAnthropicArticleGenerator();
    await generator.generate({
      transcript: "テスト用のトランスクリプト",
      persona: "hal",
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: ARTICLE_PROMPT_HAL,
        prompt: "テスト用のトランスクリプト",
      }),
    );
    expect(mockAnthropic).toHaveBeenCalledWith("claude-sonnet-4-5");
  });

  it("ロイペルソナで正しいプロンプトを使用する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("# タイトル\n\n技術記事の本文。") as never,
    );

    const generator = createAnthropicArticleGenerator();
    await generator.generate({
      transcript: "技術的な内容",
      persona: "roi",
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: ARTICLE_PROMPT_ROI,
      }),
    );
  });

  it("生成結果からタイトルと本文を正しく抽出する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("# 傾聴の力\n\n## はじめに\n\nマネージャーとして大切なこと。") as never,
    );

    const generator = createAnthropicArticleGenerator();
    const result = await generator.generate({
      transcript: "テスト",
      persona: "hal",
    });

    expect(result.title).toBe("傾聴の力");
    expect(result.bodyMd).toContain("## はじめに");
    expect(result.model).toBe("claude-sonnet-4-5");
  });
});

describe("createOpenAIArticleGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gpt-5 モデルを使用する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("# タイトル\n\n本文") as never,
    );

    const generator = createOpenAIArticleGenerator();
    const result = await generator.generate({
      transcript: "テスト",
      persona: "hal",
    });

    expect(mockOpenai).toHaveBeenCalledWith("gpt-5");
    expect(result.model).toBe("gpt-5");
  });
});

describe("createGoogleArticleGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gemini-2.5-pro モデルを使用する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("# タイトル\n\n本文") as never,
    );

    const generator = createGoogleArticleGenerator();
    const result = await generator.generate({
      transcript: "テスト",
      persona: "roi",
    });

    expect(mockGoogle).toHaveBeenCalledWith("gemini-2.5-pro");
    expect(result.model).toBe("gemini-2.5-pro");
  });
});
