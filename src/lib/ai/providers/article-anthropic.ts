/**
 * Anthropic Claude 記事生成アダプタ
 *
 * モデル: claude-sonnet-4-5
 * 用途: Voicedo 記事生成（Stage 1 ブラインドテストで選定）
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ArticleGenerator, Persona } from "../types";
import { ARTICLE_PROMPT_HAL, ARTICLE_PROMPT_ROI } from "../personas";
import { ARTICLE_CONFIG } from "../config";
import { AIProviderError, errorCodeFromStatus } from "../errors";
import { parseArticleOutput } from "./article-parser";

const PROVIDER_NAME = "anthropic";

/**
 * Anthropic Claude 記事生成アダプタを作成
 */
export function createAnthropicArticleGenerator(): ArticleGenerator {
  return {
    async generate(input) {
      const systemPrompt = getSystemPrompt(input.persona);
      const config = ARTICLE_CONFIG.anthropic;

      try {
        const result = await generateText({
          model: anthropic(config.model),
          system: systemPrompt,
          prompt: input.transcript,
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
        });

        const { title, bodyMd } = parseArticleOutput(result.text, PROVIDER_NAME);

        return {
          title,
          bodyMd,
          model: config.model,
        };
      } catch (error) {
        throw wrapError(error);
      }
    },
  };
}

function getSystemPrompt(persona: Persona): string {
  return persona === "hal" ? ARTICLE_PROMPT_HAL : ARTICLE_PROMPT_ROI;
}

function wrapError(error: unknown): AIProviderError {
  // 既にAIProviderErrorの場合はそのまま
  if (error instanceof AIProviderError) {
    return error;
  }

  // HTTPエラーの場合
  if (error instanceof Error && "status" in error) {
    const status = (error as { status: number }).status;
    return new AIProviderError(
      errorCodeFromStatus(status, "article"),
      PROVIDER_NAME,
      { statusCode: status, cause: error },
    );
  }

  // ネットワークエラーの場合
  if (error instanceof Error && error.message.includes("fetch")) {
    return new AIProviderError("ARTICLE_NETWORK_ERROR", PROVIDER_NAME, {
      cause: error,
    });
  }

  // その他のエラー
  return new AIProviderError("ARTICLE_GENERATION_FAILED", PROVIDER_NAME, {
    cause: error,
  });
}
