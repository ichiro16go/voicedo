/**
 * プロバイダー統合テスト
 *
 * 実際のAPIを呼び出すテスト。
 * RUN_INTEGRATION_TESTS=true を設定した場合のみ実行。
 *
 * 実行方法:
 * RUN_INTEGRATION_TESTS=true pnpm test src/lib/ai/__tests__/providers.integration.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  createArticleGenerator,
  createChatProvider,
} from "../providers";
import { TEST_TALKS } from "../test-data";

// 明示的に統合テストを有効にした場合のみ実行
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

describe.skipIf(!runIntegrationTests || !hasAnthropicKey)(
  "Anthropic Article Generator (live)",
  () => {
    it("ハル用トランスクリプトから記事を生成できる", async () => {
      const generator = createArticleGenerator("anthropic");
      const talk = TEST_TALKS.find((t) => t.persona === "hal");

      if (!talk) {
        throw new Error("Test data not found");
      }

      const result = await generator.generate({
        transcript: talk.transcript,
        persona: "hal",
      });

      expect(result.title).toBeTruthy();
      expect(result.bodyMd.length).toBeGreaterThan(100);
      expect(result.model).toContain("claude");
    }, 60000); // 60秒タイムアウト
  },
);

describe.skipIf(!runIntegrationTests || !hasOpenAIKey)(
  "OpenAI Article Generator (live)",
  () => {
    it("ロイ用トランスクリプトから記事を生成できる", async () => {
      const generator = createArticleGenerator("openai");
      const talk = TEST_TALKS.find((t) => t.persona === "roi");

      if (!talk) {
        throw new Error("Test data not found");
      }

      const result = await generator.generate({
        transcript: talk.transcript,
        persona: "roi",
      });

      expect(result.title).toBeTruthy();
      expect(result.bodyMd.length).toBeGreaterThan(100);
      expect(result.model).toContain("gpt");
    }, 60000);
  },
);

describe.skipIf(!runIntegrationTests || !hasGoogleKey)(
  "Google Article Generator (live)",
  () => {
    it("ハル用トランスクリプトから記事を生成できる", async () => {
      const generator = createArticleGenerator("google");
      const talk = TEST_TALKS.find((t) => t.persona === "hal");

      if (!talk) {
        throw new Error("Test data not found");
      }

      const result = await generator.generate({
        transcript: talk.transcript,
        persona: "hal",
      });

      expect(result.title).toBeTruthy();
      expect(result.bodyMd.length).toBeGreaterThan(100);
      expect(result.model).toContain("gemini");
    }, 60000);
  },
);

describe.skipIf(!runIntegrationTests || !hasOpenAIKey)(
  "OpenAI Chat Provider (live)",
  () => {
    it("ハルとして短い深掘り質問を生成できる", async () => {
      const provider = createChatProvider("openai");

      const result = await provider.chat(
        [
          {
            role: "user",
            content:
              "今日、メンバーの鈴木さんと1on1をやったんだけど、いつもと違うアプローチを試してみたんだよね。",
          },
        ],
        { persona: "hal" },
      );

      expect(result.content).toBeTruthy();
      // ハルの返答は60文字以内（目安）
      expect(result.content.length).toBeLessThan(100);
    }, 30000);

    it("ロイとして技術的な質問を生成できる", async () => {
      const provider = createChatProvider("openai");

      const result = await provider.chat(
        [
          {
            role: "user",
            content: "Next.jsでHydrationエラーが出て3時間溶かしました。",
          },
        ],
        { persona: "roi" },
      );

      expect(result.content).toBeTruthy();
      // ロイの返答は80文字以内（目安）
      expect(result.content.length).toBeLessThan(120);
    }, 30000);
  },
);

// STT のライブテストは音声ファイルが必要なため、別途実装
// describe.skipIf(!runIntegrationTests || !hasOpenAIKey)(
//   "OpenAI STT Provider (live)",
//   () => {
//     it("音声ファイルを文字起こしできる", async () => {
//       // 実際の音声ファイルを使用する場合のテスト
//     });
//   },
// );
