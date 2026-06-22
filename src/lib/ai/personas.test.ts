import { describe, expect, it } from "vitest";
import { ARTICLE_PROMPT_HAL, ARTICLE_PROMPT_ROI, HAL_SYSTEM, ROI_SYSTEM } from "./personas";

describe("personas: system prompts", () => {
  it("ハル: ターン制限が60文字に設定されている", () => {
    expect(HAL_SYSTEM).toMatch(/60文字/);
  });

  it("ロイ: ターン制限が80文字に設定されている", () => {
    expect(ROI_SYSTEM).toMatch(/80文字/);
  });

  it("ハル/ロイ: 複数質問・絵文字をNGとして明示", () => {
    for (const p of [HAL_SYSTEM, ROI_SYSTEM]) {
      expect(p).toMatch(/複数質問/);
      expect(p).toMatch(/絵文字/);
    }
  });
});

describe("personas: article prompts", () => {
  it("ハル記事: 敬体・第三者名のREDACT指示が含まれる", () => {
    expect(ARTICLE_PROMPT_HAL).toMatch(/敬体/);
    expect(ARTICLE_PROMPT_HAL).toMatch(/\{\{REDACT\}\}/);
  });

  it("ロイ記事: 常体・推測補完禁止が含まれる", () => {
    expect(ARTICLE_PROMPT_ROI).toMatch(/常体/);
    expect(ARTICLE_PROMPT_ROI).toMatch(/推測/);
  });

  it("両プロンプト: Markdown 以外の前置きを禁止", () => {
    for (const p of [ARTICLE_PROMPT_HAL, ARTICLE_PROMPT_ROI]) {
      expect(p).toMatch(/Markdown のみ/);
    }
  });
});
