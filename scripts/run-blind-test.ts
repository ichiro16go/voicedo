import fs from "node:fs";
import path from "node:path";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import dotenv from "dotenv";
import { ARTICLE_PROMPT_HAL, ARTICLE_PROMPT_ROI } from "../src/lib/ai/personas";
import { TEST_TALKS } from "../src/lib/ai/test-data";

// .envをロード
dotenv.config({ path: path.join(__dirname, "../.env") });

// 各プロバイダーの設定（config.ts と同期）
const models = {
  Model_A: {
    name: "Model A",
    provider: anthropic("claude-sonnet-4-5"),
    realName: "Claude Sonnet 4.5 (claude-sonnet-4-5)",
  },
  Model_B: {
    name: "Model B",
    provider: openai("gpt-5"),
    realName: "GPT-5 (gpt-5)",
  },
  Model_C: {
    name: "Model C",
    provider: google("gemini-2.5-pro"),
    realName: "Gemini 2.5 Pro (gemini-2.5-pro)",
  },
};

async function runTest() {
  console.log("🚀 LLM ブラインドテストを開始します...");
  console.log(`対象トーク数: ${TEST_TALKS.length}`);
  console.log("API キーの読み込み状況:");
  console.log(`- Anthropic: ${process.env.ANTHROPIC_API_KEY ? "OK" : "NG"}`);
  console.log(`- OpenAI: ${process.env.OPENAI_API_KEY ? "OK" : "NG"}`);
  console.log(`- Google: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "OK" : "NG"}`);

  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("⚠️ すべてのAPIキーが設定されている必要があります。テストを中断します。");
    process.exit(1);
  }

  let markdownContent = `# LLM 記事生成ブラインドテスト結果レポート

このレポートは、音声日記アプリ **Voicedo** の記事生成フェーズにおける最適な LLM モデルを決定するために、実音声を想定した 5 本の書き起こしテキストを対象として実施したブラインドテストの結果です。

## 評価方法
- **対象モデル**: 3社の最高峰モデル（Model A, Model B, Model C として名前を隠した状態で掲載）
- **入力データ**: ハル用（note向け）3本、ロイ用（Qiita向け）2本の計5本のテストトーク
- **評価基準**:
  1. **要件順守**: 文字数制限（ハル: 700〜1200字、ロイ: 800〜1500字）、見出し構成、定型句禁止、Markdownのみ出力
  2. **品質・自然さ**: 口語の書き起こしから自然で読みやすい記事に整えられているか。過剰な脚色や推測補正がないか。
  3. **キャラクター性**:
     - **ハル**: 敬体（です・ます調）、温かみ、{{REDACT}} 処理と末尾記録が正しく行われているか。
     - **ロイ**: 常体（だ・である調）、技術的な正確さ、曖昧な箇所の (要確認) 表記、コードブロックの活用。

---

`;

  // 各トークに対して実行
  for (const talk of TEST_TALKS) {
    console.log(`\n📝 トークを処理中: ${talk.title}...`);
    markdownContent += `## 【テスト ${talk.id.toUpperCase()}】 ${talk.title}\n\n`;
    markdownContent += `### 1. 元の書き起こしテキスト（インプット）\n\n`;
    markdownContent += `\`\`\`text\n${talk.transcript}\n\`\`\`\n\n`;

    const systemPrompt = talk.persona === "hal" ? ARTICLE_PROMPT_HAL : ARTICLE_PROMPT_ROI;

    markdownContent += `### 2. 各モデルの生成記事（アウトプット）\n\n`;

    // 3つのモデルで並行処理
    const promises = Object.entries(models).map(async ([key, config]) => {
      try {
        console.log(`  -> ${config.name} で生成中...`);
        const response = await generateText({
          model: config.provider,
          system: systemPrompt,
          prompt: `以下の書き起こしテキストを元に記事を生成してください。\n\n${talk.transcript}`,
        });
        return {
          key,
          name: config.name,
          text: response.text,
          error: null,
        };
      } catch (err: any) {
        console.error(`  ❌ ${config.name} でのエラー:`, err);
        if (err instanceof Error) {
          console.error(`  Stack:`, err.stack);
        }
        return {
          key,
          name: config.name,
          text: "",
          error: err.message,
        };
      }
    });

    const results = await Promise.all(promises);

    for (const res of results) {
      markdownContent += `#### 🤖 ${res.name}\n\n`;
      if (res.error) {
        markdownContent += `> ⚠️ 生成エラーが発生しました:\n> \`${res.error}\`\n\n`;
      } else {
        markdownContent += `${res.text}\n\n`;
      }
      markdownContent += `---\n\n`;
    }
  }

  // ネタばらしセクションを追加（アコーディオン形式）
  markdownContent += `## 🕵️‍♂️ モデルの正体（ネタばらし）

<details>
<summary>ここをクリックして、各モデルの実際の名前を表示します</summary>

| 伏字名 | 実際のモデル名 |
| :--- | :--- |
| **Model A** | ${models.Model_A.realName} |
| **Model B** | ${models.Model_B.realName} |
| **Model C** | ${models.Model_C.realName} |

</details>

---

## 📋 総合評価・分析

（※ テスト結果の生成完了後、こちらのセクションに各モデルの強み・弱み、要件順守率、および最終的な採用LLMの推薦理由を記載します）
`;

  const outputPath = path.join(__dirname, "../docs/blind-test-results.md");
  fs.writeFileSync(outputPath, markdownContent, "utf-8");
  console.log(`\n🎉 テストが完了しました！結果は ${outputPath} に保存されました。`);
}

runTest().catch((err) => {
  console.error("致命的なエラーが発生しました:", err);
  process.exit(1);
});
