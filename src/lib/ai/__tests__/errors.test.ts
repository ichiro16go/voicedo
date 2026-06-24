import { describe, expect, it } from "vitest";
import { AIProviderError, errorCodeFromStatus } from "../errors";

describe("AIProviderError", () => {
  it("エラーコードと静的メッセージを持つ", () => {
    const error = new AIProviderError("STT_TRANSCRIPTION_FAILED", "openai");

    expect(error.code).toBe("STT_TRANSCRIPTION_FAILED");
    expect(error.provider).toBe("openai");
    expect(error.message).toBe("音声文字起こしに失敗しました");
    expect(error.name).toBe("AIProviderError");
  });

  it("statusCode を保持できる", () => {
    const error = new AIProviderError("RATE_LIMITED", "anthropic", {
      statusCode: 429,
    });

    expect(error.statusCode).toBe(429);
  });

  it("ネットワークエラーはデフォルトでリトライ可能", () => {
    const networkError = new AIProviderError("STT_NETWORK_ERROR", "openai");
    expect(networkError.retryable).toBe(true);

    const rateLimited = new AIProviderError("RATE_LIMITED", "openai");
    expect(rateLimited.retryable).toBe(true);
  });

  it("認証エラーはリトライ不可", () => {
    const authError = new AIProviderError("INVALID_API_KEY", "openai");
    expect(authError.retryable).toBe(false);
  });

  it("retryable を明示的に上書きできる", () => {
    const error = new AIProviderError("RATE_LIMITED", "openai", {
      retryable: false,
    });

    expect(error.retryable).toBe(false);
  });

  it("cause を保持できる", () => {
    const originalError = new Error("Original");
    const error = new AIProviderError("CHAT_GENERATION_FAILED", "openai", {
      cause: originalError,
    });

    expect(error.cause).toBe(originalError);
  });
});

describe("errorCodeFromStatus", () => {
  it("401/403 は INVALID_API_KEY を返す", () => {
    expect(errorCodeFromStatus(401, "stt")).toBe("INVALID_API_KEY");
    expect(errorCodeFromStatus(403, "chat")).toBe("INVALID_API_KEY");
  });

  it("429 は RATE_LIMITED を返す", () => {
    expect(errorCodeFromStatus(429, "article")).toBe("RATE_LIMITED");
  });

  it("5xx は PROVIDER_UNAVAILABLE を返す", () => {
    expect(errorCodeFromStatus(500, "stt")).toBe("PROVIDER_UNAVAILABLE");
    expect(errorCodeFromStatus(502, "chat")).toBe("PROVIDER_UNAVAILABLE");
    expect(errorCodeFromStatus(503, "article")).toBe("PROVIDER_UNAVAILABLE");
  });

  it("その他の 4xx はコンテキストに応じたエラーを返す", () => {
    expect(errorCodeFromStatus(400, "stt")).toBe("STT_TRANSCRIPTION_FAILED");
    expect(errorCodeFromStatus(422, "chat")).toBe("CHAT_GENERATION_FAILED");
    expect(errorCodeFromStatus(404, "article")).toBe("ARTICLE_GENERATION_FAILED");
  });
});
