/**
 * Google Gemini 記事生成アダプタ
 *
 * モデル: gemini-2.5-pro
 * 用途: Voicedo 記事生成（比較用）
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { ArticleGenerator, Persona } from "../types";
import { ARTICLE_PROMPT_HAL, ARTICLE_PROMPT_ROI } from "../personas";
import { ARTICLE_CONFIG } from "../config";
import { AIProviderError, errorCodeFromStatus } from "../errors";
import { parseArticleOutput } from "./article-parser";

const PROVIDER_NAME = "google";

/**
 * Google Gemini 記事生成アダプタを作成
 */
export function createGoogleArticleGenerator(): ArticleGenerator {
  return {
    async generate(input) {
      const systemPrompt = getSystemPrompt(input.persona);
      const config = ARTICLE_CONFIG.google;

      try {
        const result = await generateText({
          model: google(config.model),
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
  if (error instanceof AIProviderError) {
    return error;
  }

  if (error instanceof Error && "status" in error) {
    const status = (error as { status: number }).status;
    return new AIProviderError(
      errorCodeFromStatus(status, "article"),
      PROVIDER_NAME,
      { statusCode: status, cause: error },
    );
  }

  if (error instanceof Error && error.message.includes("fetch")) {
    return new AIProviderError("ARTICLE_NETWORK_ERROR", PROVIDER_NAME, {
      cause: error,
    });
  }

  return new AIProviderError("ARTICLE_GENERATION_FAILED", PROVIDER_NAME, {
    cause: error,
  });
}
