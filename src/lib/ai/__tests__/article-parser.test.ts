import { describe, expect, it } from "vitest";
import { parseArticleOutput, validateArticleLength } from "../providers/article-parser";
import { AIProviderError } from "../errors";

describe("parseArticleOutput", () => {
  it("# 見出しをタイトルとして抽出し、本文から除去する", () => {
    const input = `# タイトルです

## セクション1

本文の内容がここに入ります。`;

    const result = parseArticleOutput(input, "test");

    expect(result.title).toBe("タイトルです");
    expect(result.bodyMd).not.toContain("# タイトルです");
    expect(result.bodyMd).toContain("## セクション1");
  });

  it("# がない場合、最初の ## をタイトルとして使用する", () => {
    const input = `## 最初の見出し

本文の内容。

## 二番目の見出し

続きの内容。`;

    const result = parseArticleOutput(input, "test");

    expect(result.title).toBe("最初の見出し");
    expect(result.bodyMd).toContain("## 最初の見出し"); // ## は本文に残す
  });

  it("見出しがない場合、最初の空でない行をタイトルにする", () => {
    const input = `これがタイトルになる

本文の内容がここに。`;

    const result = parseArticleOutput(input, "test");

    expect(result.title).toBe("これがタイトルになる");
  });

  it("空の入力でエラーを投げる", () => {
    expect(() => parseArticleOutput("", "test")).toThrow(AIProviderError);
    expect(() => parseArticleOutput("   ", "test")).toThrow(AIProviderError);
    expect(() => parseArticleOutput("\n\n", "test")).toThrow(AIProviderError);
  });

  it("# タイトルの前に空行があっても正しく抽出する", () => {
    const input = `

# タイトル

本文`;

    const result = parseArticleOutput(input, "test");

    expect(result.title).toBe("タイトル");
  });
});

describe("validateArticleLength", () => {
  it("指定範囲内の文字数でvalidを返す", () => {
    const bodyMd = "あ".repeat(800);
    const result = validateArticleLength(bodyMd, 700, 1200);

    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(800);
  });

  it("最小文字数未満でinvalidを返す", () => {
    const bodyMd = "あ".repeat(500);
    const result = validateArticleLength(bodyMd, 700, 1200);

    expect(result.valid).toBe(false);
    expect(result.charCount).toBe(500);
  });

  it("最大文字数超過でinvalidを返す", () => {
    const bodyMd = "あ".repeat(1500);
    const result = validateArticleLength(bodyMd, 700, 1200);

    expect(result.valid).toBe(false);
    expect(result.charCount).toBe(1500);
  });

  it("Markdown記法を除いて文字数をカウントする", () => {
    const bodyMd = `## 見出し

**太字**と*斜体*と\`コード\`を含む文章。

[リンク](https://example.com)もある。

<!-- コメント -->`;

    const result = validateArticleLength(bodyMd, 0, 1000);

    // 見出し記号、装飾記号、リンク構文、コメントが除去される
    expect(result.charCount).toBeLessThan(bodyMd.length);
    expect(result.valid).toBe(true);
  });
});
