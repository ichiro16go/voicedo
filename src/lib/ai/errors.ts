/**
 * AI Provider エラー型
 *
 * セキュリティ要件（AGENTS.md §5.5）:
 * - 音声/transcript/記事本文をログに出さない
 * - エラーメッセージは静的テンプレートのみ
 */

/** エラーコード（ログ/監視で使う識別子） */
export type AIErrorCode =
  | "STT_TRANSCRIPTION_FAILED"
  | "STT_INVALID_AUDIO"
  | "STT_NETWORK_ERROR"
  | "CHAT_GENERATION_FAILED"
  | "CHAT_NETWORK_ERROR"
  | "ARTICLE_GENERATION_FAILED"
  | "ARTICLE_PARSE_FAILED"
  | "ARTICLE_NETWORK_ERROR"
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE";

/**
 * AIプロバイダー共通エラー
 *
 * 注意: このエラーには個人データ（音声内容、transcript、記事本文）を含めない
 */
export class AIProviderError extends Error {
  readonly code: AIErrorCode;
  readonly provider: string;
  readonly statusCode?: number;
  /** リトライ可能かどうか */
  readonly retryable: boolean;

  constructor(
    code: AIErrorCode,
    provider: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    // 静的メッセージのみ（個人データを含めない）
    super(getStaticMessage(code));
    this.name = "AIProviderError";
    this.code = code;
    this.provider = provider;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? isRetryable(code);
    this.cause = options?.cause;
  }
}

/** エラーコードから静的メッセージを生成（個人データを含まない） */
function getStaticMessage(code: AIErrorCode): string {
  const messages: Record<AIErrorCode, string> = {
    STT_TRANSCRIPTION_FAILED: "音声文字起こしに失敗しました",
    STT_INVALID_AUDIO: "音声ファイルの形式が無効です",
    STT_NETWORK_ERROR: "音声文字起こしサービスへの接続に失敗しました",
    CHAT_GENERATION_FAILED: "対話応答の生成に失敗しました",
    CHAT_NETWORK_ERROR: "対話サービスへの接続に失敗しました",
    ARTICLE_GENERATION_FAILED: "記事生成に失敗しました",
    ARTICLE_PARSE_FAILED: "記事出力の解析に失敗しました",
    ARTICLE_NETWORK_ERROR: "記事生成サービスへの接続に失敗しました",
    INVALID_API_KEY: "APIキーが無効です",
    RATE_LIMITED: "リクエスト制限に達しました。しばらくお待ちください",
    PROVIDER_UNAVAILABLE: "AIサービスが一時的に利用できません",
  };
  return messages[code];
}

/** リトライ可能なエラーかどうかのデフォルト判定 */
function isRetryable(code: AIErrorCode): boolean {
  const retryableCodes: AIErrorCode[] = [
    "STT_NETWORK_ERROR",
    "CHAT_NETWORK_ERROR",
    "ARTICLE_NETWORK_ERROR",
    "RATE_LIMITED",
    "PROVIDER_UNAVAILABLE",
  ];
  return retryableCodes.includes(code);
}

/** HTTPステータスコードからエラーコードを推定 */
export function errorCodeFromStatus(
  status: number,
  context: "stt" | "chat" | "article",
): AIErrorCode {
  if (status === 401 || status === 403) {
    return "INVALID_API_KEY";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  if (status >= 500) {
    return "PROVIDER_UNAVAILABLE";
  }
  // 4xx 系はコンテキストに応じたエラー
  const contextErrors: Record<typeof context, AIErrorCode> = {
    stt: "STT_TRANSCRIPTION_FAILED",
    chat: "CHAT_GENERATION_FAILED",
    article: "ARTICLE_GENERATION_FAILED",
  };
  return contextErrors[context];
}
