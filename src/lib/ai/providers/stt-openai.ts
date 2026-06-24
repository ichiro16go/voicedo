/**
 * OpenAI STT（音声文字起こし）アダプタ
 *
 * モデル: gpt-4o-transcribe
 * 用途: 3-5分の音声 → テキスト変換
 *
 * 注意: Vercel AI SDK に STT は含まれないため、fetch で直接 OpenAI API を呼ぶ
 */

import type { STTProvider } from "../types";
import { STT_CONFIG } from "../config";
import { AIProviderError, errorCodeFromStatus } from "../errors";

const PROVIDER_NAME = "openai";
const OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions";

interface TranscriptionResponse {
  text: string;
  /** gpt-4o-transcribe が返す場合がある（verbose_json 形式時） */
  duration?: number;
}

/**
 * OpenAI STT アダプタを作成
 *
 * @param apiKey - OpenAI API キー（省略時は環境変数 OPENAI_API_KEY）
 */
export function createOpenAISTTProvider(apiKey?: string): STTProvider {
  const key = apiKey ?? process.env.OPENAI_API_KEY;

  if (!key) {
    throw new AIProviderError("INVALID_API_KEY", PROVIDER_NAME);
  }

  return {
    async transcribe(audio) {
      const config = STT_CONFIG.openai;

      // MIMEタイプの検証
      if (!config.supportedMimeTypes.includes(audio.mimeType as (typeof config.supportedMimeTypes)[number])) {
        throw new AIProviderError("STT_INVALID_AUDIO", PROVIDER_NAME);
      }

      try {
        // 音声ファイルを取得（URI から Blob に変換）
        const audioBlob = await fetchAudioBlob(audio.uri, audio.mimeType);

        // FormData を構築
        const formData = new FormData();
        formData.append("file", audioBlob, getFilename(audio.mimeType));
        formData.append("model", config.model);
        formData.append("response_format", "verbose_json");

        // OpenAI API を呼び出し
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new AIProviderError(
            errorCodeFromStatus(response.status, "stt"),
            PROVIDER_NAME,
            { statusCode: response.status },
          );
        }

        const data = (await response.json()) as TranscriptionResponse;

        return {
          text: data.text,
          durationSec: data.duration ?? 0,
        };
      } catch (error) {
        throw wrapError(error);
      }
    },
  };
}

/**
 * URIから音声Blobを取得
 *
 * 対応形式:
 * - file:// (Expo FileSystem)
 * - https:// (Supabase Storage 署名付きURL)
 * - data: (Base64)
 */
async function fetchAudioBlob(uri: string, mimeType: string): Promise<Blob> {
  // data URI の場合
  if (uri.startsWith("data:")) {
    const base64 = uri.split(",")[1];
    if (!base64) {
      throw new AIProviderError("STT_INVALID_AUDIO", PROVIDER_NAME);
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  // file:// または https:// の場合
  const response = await fetch(uri);
  if (!response.ok) {
    throw new AIProviderError("STT_INVALID_AUDIO", PROVIDER_NAME);
  }
  return response.blob();
}

/**
 * MIMEタイプからファイル名を生成
 */
function getFilename(mimeType: string): string {
  const extensions: Record<string, string> = {
    "audio/webm": "audio.webm",
    "audio/mp4": "audio.mp4",
    "audio/mpeg": "audio.mp3",
    "audio/wav": "audio.wav",
    "audio/m4a": "audio.m4a",
  };
  return extensions[mimeType] ?? "audio.bin";
}

function wrapError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) {
    return error;
  }

  if (error instanceof Error && error.message.includes("fetch")) {
    return new AIProviderError("STT_NETWORK_ERROR", PROVIDER_NAME, {
      cause: error,
    });
  }

  return new AIProviderError("STT_TRANSCRIPTION_FAILED", PROVIDER_NAME, {
    cause: error,
  });
}
