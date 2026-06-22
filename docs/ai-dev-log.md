# AI Dev Log

> AI を使った開発で得た学び・失敗・効いたプロンプトをここに残す。
> 同じミスが2回起きたら、`AGENTS.md` のルールに昇格させる。

## テンプレ
```md
## YYYY-MM-DD — <タスク名>
- **Agent/tool**: Claude Code / Copilot CLI / Cursor / 他
- **Task**: 何を頼んだか（1-2行）
- **Prompt(s)**: 効いたプロンプト、または失敗したプロンプトの要約
- **Good**: 良かった挙動
- **Bad**: ハルシネ・ミス・無駄なリファクタ等
- **Root cause**: なぜそれが起きたか
- **Rule to add**: AGENTS.md に追加すべきルール（あれば）
- **Follow-up**: 残タスク
```

---

## 2026-06-22 — リポジトリ初期化 + AI開発ガイド整備
- **Agent/tool**: GitHub Copilot CLI (Claude Opus 4.7)
- **Task**: Expo 56 + Supabase + AI SDK + Biome の scaffolding と、AI向け開発ルール整備
- **Good**:
  - `AGENTS.md` 起点で CLAUDE.md / `.cursorrules` / `.github/copilot-instructions.md` に分岐する構造を採用
  - DB スキーマと RLS を最初から書いた（プライバシー要件と整合）
  - `src/lib/ai/types.ts` でマルチプロバイダー抽象を初日から確保
- **Bad**:
  - 初版の `docs/tech-stack.md` v1.0 セクションを残したまま v1.1 を追記し、`expo-av` / Next.js / PWA など旧方針が混在
  - 初版 `AGENTS.md` に AI 駆動開発ループ・サブエージェント・PR レビュー観点が欠落
  - `pnpm test` が AGENTS で要求されているのに、Vitest 未セットアップで実行経路が無い状態
- **Root cause**:
  - 既存ドキュメントに「上書き」ではなく「追記」だけしたため、過去判断と現方針の整合が崩れた
  - AGENTS.md を「ルール集」として書き始め、「学習ループ」として設計しなかった
- **Rule to add**:
  - AGENTS §3.5 AI駆動開発ループ
  - AGENTS §3.6 サブエージェント役割分担
  - AGENTS §5.5 AI生成コードレビュー観点（特に Voicedo の音声/RLS/プロンプト注入）
  - tech-stack.md は版上げ時に旧セクションを必ず削除（追記しない）
- **Follow-up**:
  - Vitest を導入し `pnpm test` の経路を作る（このコミットで実施）
  - Stage 1 開始前に `gpt-5 vs Claude Sonnet 4.5 vs Gemini 2.5 Pro` のブラインドテスト
