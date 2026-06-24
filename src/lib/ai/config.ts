/**
 * AIモデル設定
 *
 * 参照: docs/tech-stack.md, docs/plan.md
 */

/** STT（音声文字起こし）モデル設定 */
export const STT_CONFIG = {
  /** OpenAI gpt-4o-transcribe */
  openai: {
    model: "gpt-4o-transcribe" as const,
    /** 最大音声時間（秒） */
    maxDurationSec: 600,
    /** 対応MIMEタイプ */
    supportedMimeTypes: [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/m4a",
    ],
  },
} as const;

/** Chat（対話）モデル設定 */
export const CHAT_CONFIG = {
  /** OpenAI gpt-5-mini（メイン） */
  openai: {
    model: "gpt-5-mini" as const,
    maxOutputTokens: 150,
    temperature: 0.7,
  },
  /** Google Gemini 2.5 Flash（フォールバック） */
  google: {
    model: "gemini-2.5-flash" as const,
    maxOutputTokens: 150,
    temperature: 0.7,
  },
} as const;

/** Article（記事生成）モデル設定 */
export const ARTICLE_CONFIG = {
  /** Anthropic Claude Sonnet 4.5（メイン: Stage 1ブラインドテストで確定） */
  anthropic: {
    model: "claude-sonnet-4-5" as const,
    maxOutputTokens: 3000,
    temperature: 0.5,
  },
  /** OpenAI gpt-5（比較用） */
  openai: {
    model: "gpt-5" as const,
    maxOutputTokens: 3000,
    temperature: 0.5,
  },
  /** Google Gemini 2.5 Pro（比較用） */
  google: {
    model: "gemini-2.5-pro" as const,
    maxOutputTokens: 3000,
    temperature: 0.5,
  },
} as const;

/** プロバイダー識別子 */
export type ArticleProviderKey = keyof typeof ARTICLE_CONFIG;
export type ChatProviderKey = keyof typeof CHAT_CONFIG;
export type STTProviderKey = keyof typeof STT_CONFIG;
