/**
 * OpenAI GPT Chat アダプタ
 *
 * モデル: gpt-5-mini
 * 用途: ハル/ロイの対話質問生成
 *
 * 注意: ストリーミング対応版は別途実装予定
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ChatProvider, ChatMessage, Persona } from "../types";
import { HAL_SYSTEM, ROI_SYSTEM } from "../personas";
import { CHAT_CONFIG } from "../config";
import { AIProviderError, errorCodeFromStatus } from "../errors";

const PROVIDER_NAME = "openai";

/**
 * OpenAI Chat アダプタを作成
 */
export function createOpenAIChatProvider(): ChatProvider {
  return {
    async chat(messages, opts) {
      const systemPrompt = getSystemPrompt(opts.persona);
      const config = CHAT_CONFIG.openai;

      try {
        const result = await generateText({
          model: openai(config.model),
          system: systemPrompt,
          messages: convertMessages(messages),
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
        });

        return { content: result.text };
      } catch (error) {
        throw wrapError(error);
      }
    },
  };
}

function getSystemPrompt(persona: Persona): string {
  return persona === "hal" ? HAL_SYSTEM : ROI_SYSTEM;
}

/**
 * ChatMessage[] を Vercel AI SDK のメッセージ形式に変換
 *
 * 注意: system メッセージは generateText の system パラメータで渡すため、
 * ここでは user/assistant のみを変換
 */
function convertMessages(
  messages: ChatMessage[],
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

function wrapError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) {
    return error;
  }

  if (error instanceof Error && "status" in error) {
    const status = (error as { status: number }).status;
    return new AIProviderError(
      errorCodeFromStatus(status, "chat"),
      PROVIDER_NAME,
      { statusCode: status, cause: error },
    );
  }

  if (error instanceof Error && error.message.includes("fetch")) {
    return new AIProviderError("CHAT_NETWORK_ERROR", PROVIDER_NAME, {
      cause: error,
    });
  }

  return new AIProviderError("CHAT_GENERATION_FAILED", PROVIDER_NAME, {
    cause: error,
  });
}
