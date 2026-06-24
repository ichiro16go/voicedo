import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createOpenAISTTProvider } from "../providers/stt-openai";
import { AIProviderError } from "../errors";

// グローバル fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("createOpenAISTTProvider", () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("APIキーがない場合にエラーを投げる", () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => createOpenAISTTProvider()).toThrow(AIProviderError);
  });

  it("明示的にAPIキーを渡せる", () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => createOpenAISTTProvider("explicit-key")).not.toThrow();
  });

  it("サポートされていないMIMEタイプでエラーを投げる", async () => {
    const provider = createOpenAISTTProvider();

    await expect(
      provider.transcribe({
        uri: "https://example.com/audio.ogg",
        mimeType: "audio/ogg",
      }),
    ).rejects.toThrow(AIProviderError);
  });

  it("正常なレスポンスを処理する", async () => {
    // 音声ファイル取得のモック
    const audioBlob = new Blob(["fake-audio-data"], { type: "audio/webm" });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(audioBlob),
      })
      // OpenAI API のモック
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            text: "書き起こされたテキスト",
            duration: 180.5,
          }),
      });

    const provider = createOpenAISTTProvider();
    const result = await provider.transcribe({
      uri: "https://storage.example.com/audio.webm",
      mimeType: "audio/webm",
    });

    expect(result.text).toBe("書き起こされたテキスト");
    expect(result.durationSec).toBe(180.5);

    // OpenAI API への呼び出しを検証
    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(apiCall[1].method).toBe("POST");
    expect(apiCall[1].headers.Authorization).toBe("Bearer test-api-key");
  });

  it("data URI を処理する", async () => {
    const base64Audio = btoa("fake-audio-data");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          text: "data URIからの書き起こし",
          duration: 60,
        }),
    });

    const provider = createOpenAISTTProvider();
    const result = await provider.transcribe({
      uri: `data:audio/webm;base64,${base64Audio}`,
      mimeType: "audio/webm",
    });

    expect(result.text).toBe("data URIからの書き起こし");
  });

  it("APIエラーを適切にラップする", async () => {
    const audioBlob = new Blob(["fake-audio-data"], { type: "audio/webm" });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(audioBlob),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

    const provider = createOpenAISTTProvider();

    await expect(
      provider.transcribe({
        uri: "https://storage.example.com/audio.webm",
        mimeType: "audio/webm",
      }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      provider: "openai",
      statusCode: 429,
    });
  });

  it("認証エラーを適切に処理する", async () => {
    const audioBlob = new Blob(["fake-audio-data"], { type: "audio/webm" });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(audioBlob),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

    const provider = createOpenAISTTProvider();

    await expect(
      provider.transcribe({
        uri: "https://storage.example.com/audio.webm",
        mimeType: "audio/webm",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_API_KEY",
      provider: "openai",
    });
  });

  it("音声ファイル取得失敗時にエラーを投げる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const provider = createOpenAISTTProvider();

    await expect(
      provider.transcribe({
        uri: "https://storage.example.com/not-found.webm",
        mimeType: "audio/webm",
      }),
    ).rejects.toMatchObject({
      code: "STT_INVALID_AUDIO",
    });
  });
});
