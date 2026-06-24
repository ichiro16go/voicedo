import { describe, expect, it, vi, beforeEach } from "vitest";
import { createOpenAIChatProvider } from "../providers/chat-openai";
import { HAL_SYSTEM, ROI_SYSTEM } from "../personas";

// Vercel AI SDK をモック
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-openai-model"),
}));

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const mockGenerateText = vi.mocked(generateText);
const mockOpenai = vi.mocked(openai);

// 共通のモックレスポンス生成
function createMockResponse(text: string) {
  return {
    text,
    usage: { inputTokens: 50, outputTokens: 20 },
    finishReason: "stop" as const,
    response: {
      id: "test",
      timestamp: new Date(),
      modelId: "gpt-5-mini",
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

describe("createOpenAIChatProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ハルペルソナで正しいシステムプロンプトを使用する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("なるほど、そうだったんですね。") as never,
    );

    const provider = createOpenAIChatProvider();
    await provider.chat(
      [{ role: "user", content: "今日、1on1をやったんだけど..." }],
      { persona: "hal" },
    );

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: HAL_SYSTEM,
      }),
    );
    expect(mockOpenai).toHaveBeenCalledWith("gpt-5-mini");
  });

  it("ロイペルソナで正しいシステムプロンプトを使用する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("Reactのバージョンは何を使っていますか？") as never,
    );

    const provider = createOpenAIChatProvider();
    await provider.chat(
      [{ role: "user", content: "Next.jsでHydrationエラーが..." }],
      { persona: "roi" },
    );

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: ROI_SYSTEM,
      }),
    );
  });

  it("system メッセージを messages から除外する", async () => {
    mockGenerateText.mockResolvedValue(
      createMockResponse("返答") as never,
    );

    const provider = createOpenAIChatProvider();
    await provider.chat(
      [
        { role: "system", content: "これは無視されるべき" },
        { role: "user", content: "ユーザーの発言" },
        { role: "assistant", content: "AIの返答" },
        { role: "user", content: "続きの発言" },
      ],
      { persona: "hal" },
    );

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "user", content: "ユーザーの発言" },
          { role: "assistant", content: "AIの返答" },
          { role: "user", content: "続きの発言" },
        ],
      }),
    );
  });

  it("生成されたテキストを返す", async () => {
    const expectedResponse = "それは大変でしたね。何が一番困りましたか？";
    mockGenerateText.mockResolvedValue(
      createMockResponse(expectedResponse) as never,
    );

    const provider = createOpenAIChatProvider();
    const result = await provider.chat(
      [{ role: "user", content: "テスト" }],
      { persona: "hal" },
    );

    expect(result.content).toBe(expectedResponse);
  });
});
