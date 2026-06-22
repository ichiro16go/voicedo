// マルチプロバイダー抽象化（tech-stack.md 「リスク⑩対策」）
// OpenAI / Anthropic / Google の差し替えをアプリ側に漏らさない。

export type Persona = "hal" | "roi";

export interface STTProvider {
  /** 音声ファイル(URI/Blob) → 文字起こしテキスト */
  transcribe(audio: {
    uri: string;
    mimeType: string;
  }): Promise<{ text: string; durationSec: number }>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatProvider {
  /** ハル/ロイの対話質問。短く返す前提。 */
  chat(messages: ChatMessage[], opts: { persona: Persona }): Promise<{ content: string }>;
}

export interface ArticleGenerator {
  /** セッション全体の transcript → Markdown 記事 */
  generate(input: {
    transcript: string;
    persona: Persona;
    targetLengthChars?: number;
  }): Promise<{ title: string; bodyMd: string; model: string }>;
}
