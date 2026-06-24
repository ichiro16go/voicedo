/**
 * AIプロバイダー ファクトリー
 *
 * 使用例:
 * ```ts
 * import { createArticleGenerator, createChatProvider, createSTTProvider } from "@/lib/ai/providers";
 *
 * const article = createArticleGenerator("anthropic");
 * const chat = createChatProvider("openai");
 * const stt = createSTTProvider("openai");
 * ```
 */

import type { ArticleGenerator, ChatProvider, STTProvider } from "../types";
import type { ArticleProviderKey, ChatProviderKey, STTProviderKey } from "../config";
import { createAnthropicArticleGenerator } from "./article-anthropic";
import { createOpenAIArticleGenerator } from "./article-openai";
import { createGoogleArticleGenerator } from "./article-google";
import { createOpenAIChatProvider } from "./chat-openai";
import { createOpenAISTTProvider } from "./stt-openai";

// Re-export individual factory functions
export { createAnthropicArticleGenerator } from "./article-anthropic";
export { createOpenAIArticleGenerator } from "./article-openai";
export { createGoogleArticleGenerator } from "./article-google";
export { createOpenAIChatProvider } from "./chat-openai";
export { createOpenAISTTProvider } from "./stt-openai";

// Re-export parser utilities
export { parseArticleOutput, validateArticleLength } from "./article-parser";

/**
 * 記事生成プロバイダーを作成
 *
 * @param provider - "anthropic" | "openai" | "google"
 * @returns ArticleGenerator インスタンス
 */
export function createArticleGenerator(
  provider: ArticleProviderKey,
): ArticleGenerator {
  const factories: Record<ArticleProviderKey, () => ArticleGenerator> = {
    anthropic: createAnthropicArticleGenerator,
    openai: createOpenAIArticleGenerator,
    google: createGoogleArticleGenerator,
  };

  return factories[provider]();
}

/**
 * 対話プロバイダーを作成
 *
 * @param provider - "openai" | "google"
 * @returns ChatProvider インスタンス
 *
 * 注意: 現時点では OpenAI のみ実装済み
 */
export function createChatProvider(provider: ChatProviderKey): ChatProvider {
  const factories: Record<ChatProviderKey, () => ChatProvider> = {
    openai: createOpenAIChatProvider,
    // Google フォールバックは将来実装
    google: () => {
      throw new Error("Google Chat provider not yet implemented");
    },
  };

  return factories[provider]();
}

/**
 * STT（音声文字起こし）プロバイダーを作成
 *
 * @param provider - "openai"
 * @param apiKey - 省略時は環境変数 OPENAI_API_KEY を使用
 * @returns STTProvider インスタンス
 */
export function createSTTProvider(
  provider: STTProviderKey,
  apiKey?: string,
): STTProvider {
  const factories: Record<STTProviderKey, (key?: string) => STTProvider> = {
    openai: createOpenAISTTProvider,
  };

  return factories[provider](apiKey);
}
