/**
 * 記事出力パーサー
 *
 * LLMが生成したMarkdownから、タイトルと本文を分離する。
 * personas.ts の要件:
 * - HAL: ## で始まるセクション見出し
 * - ROI: 構成は 概要 → 課題 → 解決 → ハマりポイント → まとめ
 */

import { AIProviderError } from "../errors";

export interface ParsedArticle {
  title: string;
  bodyMd: string;
}

/**
 * Markdown出力からタイトルと本文を抽出
 *
 * タイトル抽出ルール（優先順位）:
 * 1. 最初の `# ` で始まる行
 * 2. 最初の `## ` で始まる行（# がない場合）
 * 3. 最初の空でない行（見出しがない場合）
 */
export function parseArticleOutput(
  rawOutput: string,
  provider: string,
): ParsedArticle {
  const trimmed = rawOutput.trim();

  if (!trimmed) {
    throw new AIProviderError("ARTICLE_PARSE_FAILED", provider);
  }

  const lines = trimmed.split("\n");

  // 最初の # または ## 見出しを探す
  let titleLineIndex = -1;
  let title = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // # タイトル（最優先）
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      titleLineIndex = i;
      title = line.slice(2).trim();
      break;
    }

    // ## タイトル（# が見つからなければ採用）
    if (line.startsWith("## ") && titleLineIndex === -1) {
      titleLineIndex = i;
      title = line.slice(3).trim();
      // # がないか探し続ける
    }
  }

  // 見出しが見つからない場合、最初の空でない行をタイトルに
  if (titleLineIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        titleLineIndex = i;
        title = line;
        break;
      }
    }
  }

  // タイトルが見つからない（全て空行）
  if (!title) {
    throw new AIProviderError("ARTICLE_PARSE_FAILED", provider);
  }

  // タイトル行を除いた本文
  // タイトルが # で始まる場合はその行を除去、## の場合は残す
  let bodyLines: string[];
  if (lines[titleLineIndex]?.trim().startsWith("# ")) {
    bodyLines = [...lines.slice(0, titleLineIndex), ...lines.slice(titleLineIndex + 1)];
  } else {
    bodyLines = lines;
  }

  const bodyMd = bodyLines.join("\n").trim();

  return { title, bodyMd };
}

/**
 * 記事の長さを検証（文字数）
 *
 * personas.ts の要件:
 * - HAL: 700〜1200字
 * - ROI: 800〜1500字
 */
export function validateArticleLength(
  bodyMd: string,
  minChars: number,
  maxChars: number,
): { valid: boolean; charCount: number } {
  // Markdown記法を除いた文字数（概算）
  const plainText = bodyMd
    .replace(/^#+\s*/gm, "") // 見出し
    .replace(/\*\*(.+?)\*\*/g, "$1") // 太字
    .replace(/\*(.+?)\*/g, "$1") // 斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // コード
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // リンク
    .replace(/<!--[\s\S]*?-->/g, "") // コメント
    .replace(/\n+/g, " ")
    .trim();

  const charCount = plainText.length;
  return {
    valid: charCount >= minChars && charCount <= maxChars,
    charCount,
  };
}
