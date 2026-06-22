# AGENTS.md — Voicedo 開発ガイド（人間とAI共通）

> このドキュメントは **人間の開発者・AIアシスタント（Claude / GPT / Copilot / Cursor / その他）共通のルール** です。
> 作業を始める前に必ず最後まで読んでください。

---

## 0. 最重要：3つの絶対ルール

1. **公式ドキュメントを必ず確認する**（推測でAPIを書かない）
   - Expo: https://docs.expo.dev/versions/v56.0.0/
   - Supabase: https://supabase.com/docs
   - Vercel AI SDK: https://ai-sdk.dev/docs
   - 「たぶんこういうAPIがあるはず」で書かない。**実在確認 → 書く** の順。
2. **`docs/plan.md` と `docs/tech-stack.md` を意思決定の土台にする**
   - 大きな技術判断や仕様変更を加える前に必ず参照
   - 反する変更を行う場合は ADR（`docs/adr/`）を新規作成して理由を残す
3. **シークレットは絶対にコミットしない**
   - `.env` は git管理外（`.gitignore` 済）
   - 例外なし。Stripe/OpenAI/Anthropic/Supabase キーのリークは即重大インシデント

---

## 1. プロダクト概要（30秒で把握）

- **何**: 3-5分の音声 → AIが質問で深掘り → Markdown記事を自動生成 → noteエディタ起動で公開
- **誰に**: 書きたいけど書けない会社員(🅰) / エンジニア(🅰') / ラジオ感覚で話したい若年層(🅲)
- **半年フォーカス**: 🅰 田中（30代会社員、note利用層）
- **NSM**: D30 リテンション
- **撤退ライン**: `docs/plan.md` の「撤退ライン」セクション参照（率ベース）

---

## 2. 技術スタック（v1.1）

詳細は [docs/tech-stack.md](./docs/tech-stack.md)。要点：

| レイヤ | 採用 |
|---|---|
| フロント | **Expo SDK 56 (React Native + Web) + Expo Router + TypeScript** |
| UI | **NativeWind 4 (Tailwind for RN)** |
| 録音 | `expo-audio`（旧 expo-av は使わない） |
| STT | `gpt-4o-transcribe` |
| 対話LLM | `gpt-5-mini`（Gemini 2.5 Flash フォールバック） |
| 記事生成 | `Claude Sonnet 4.5`（Stage 1でブラインド比較して確定） |
| LLM抽象化 | **Vercel AI SDK** + 独自 interface（`src/lib/ai/types.ts`） |
| BE/DB/Auth | **Supabase**（Postgres + Auth + Storage + RLS + Edge Functions） |
| 決済 | **Stripe + RevenueCat ラップ** |
| 解析/監視 | PostHog / Sentry |
| Lint/Format | **Biome**（ESLint / Prettier は使わない） |
| パッケージ | **pnpm**（npm / yarn は使わない） |

---

## 3. AIアシスタント向け遵守事項

### 3.1 ハルシネーション防止
- **API名・関数名を「それっぽく」書かない**。不明な場合は次のいずれかを行う:
  1. 公式ドキュメントを fetch して確認
  2. `node_modules/<pkg>/dist/*.d.ts` を grep して型を確認
  3. 確証がなければ「未確認」とコメントを残し、ユーザーに確認を求める
- 特に Expo SDK 56 は最新で破壊的変更が多い。`expo-av` → `expo-audio`、`AsyncStorage` のimport元など、**バージョン依存の差分** を必ず確認する

### 3.2 修正範囲は最小に
- ユーザーが依頼した範囲だけを修正する
- 「ついでに」周辺コードをリファクタしない（PR review コストを増やすため）
- フォーマット差分を巨大にしない（Biome に任せる）

### 3.3 推測で「決定済」と書かない
- `plan.md` のレビューで指摘された通り、**「[x] 完了」「決定済」を安易に使わない**
- 仮置きは `[~]`、未検証は `[ ]` を使う
- 価格・指標・原価などは **検証根拠が無ければ「仮置き」と明記**

### 3.4 自律モード（autopilot）でも従うべき優先順位
1. ユーザー指示（プロンプト）
2. 既存の `AGENTS.md` / `docs/plan.md` / `docs/tech-stack.md`
3. 既存コードのパターン
4. 業界の一般的ベストプラクティス

---

## 4. コーディング規約

### 4.1 言語/型
- TypeScript strict, ESM
- `any` 禁止（`unknown` + 型ガード or zod）
- public API には JSDoc を書く（特に `src/lib/ai/types.ts` のインターフェース）

### 4.2 ファイル命名
- ファイル: `kebab-case.ts`、コンポーネント: `PascalCase.tsx`
- フック: `useXxx.ts`、定数: `UPPER_SNAKE`

### 4.3 import 順序
```ts
// 1. node 標準 / RN / Expo
import { View } from "react-native";
// 2. 外部依存
import { createClient } from "@supabase/supabase-js";
// 3. パスエイリアス（@/）
import { supabase } from "@/lib/supabase/client";
// 4. 相対 import
import { foo } from "./foo";
```

### 4.4 環境変数
- クライアントから参照する場合のみ **`EXPO_PUBLIC_`** を付ける
- サーバー専用キー（OpenAI/Anthropic/Stripe Secret 等）には **絶対に `EXPO_PUBLIC_` を付けない**
- `.env.example` に必ず追記する

### 4.5 LLM呼び出し
- **直接 `openai.chat.completions.create()` を呼ばない**
- 必ず `src/lib/ai/` の抽象インターフェース経由で呼ぶ
- プロンプトは `src/lib/ai/personas.ts` などに集約、コンポーネント内に埋め込まない

### 4.6 Supabase
- クライアント側で `service_role_key` を使わない（必ず anon + RLS）
- 新しいテーブルを追加する時は **必ず RLS ポリシーを書く**（plan.md L199の要件）
- migration は `supabase/migrations/NNNN_xxx.sql` の連番で追加

### 4.7 プライバシー
- 音声・transcript・記事本文を **ログ出力しない**（Sentry / PostHog 含む）
- 第三者の固有名詞検出ロジックを変える時は `docs/plan.md` のプライバシー仕様と整合させる

---

## 5. Git / PR ルール

### 5.1 ブランチ命名
```
feat/<scope>-<short-desc>      # 機能追加
fix/<scope>-<short-desc>        # バグ修正
chore/<scope>-<short-desc>      # 雑務（依存更新など）
docs/<short-desc>               # ドキュメントのみ
refactor/<scope>-<short-desc>   # 振る舞いを変えない整理
```
- `<scope>` 例: `recorder`, `auth`, `ai`, `billing`, `supabase`

### 5.2 コミットメッセージ（Conventional Commits）
```
feat(recorder): add expo-audio recorder hook
fix(supabase): correct RLS policy for turns table
chore(deps): bump expo to 56.0.13
docs(plan): mark pricing as hypothesis
```
- 日本語タイトルも可（ただし `prefix:` は英語）

### 5.3 PR 単位
- **1 issue = 1 PR**（[user memory] 複数issueを1PRに入れない）
- PR説明には以下を含める:
  - 関連issue / 関連docs（plan.md のどの判断に基づくか）
  - 検証内容（実機 / ユニット / スクショ）
  - リスク・撤退手段

### 5.4 マージ前必須チェック
```bash
pnpm typecheck && pnpm lint
```
両方 0 エラーであること。

---

## 6. テスト方針（Stage 1）

- **過剰なテストを書かない**。Stage 1 はプロト性が高いため:
  - **書く**: `src/lib/ai/*` の抽象 / DB スキーマ整合 / RLS ポリシー
  - **書かない**: 画面UIのスナップショット、E2E自動化（Maestroは Stage 2 で導入）
- ユニット: Vitest
- E2E: Maestro（Stage 2〜）

---

## 7. ドキュメント運用

- 重大な技術判断は ADR (`docs/adr/NNNN-xxx.md`) として残す
- `docs/plan.md` は **進捗マーカー 3 段階**を使う:
  - `[x]` 完了（事実）
  - `[~]` 仮説化済（戦略は固めたが検証で確定）
  - `[ ]` 検証待ち

---

## 8. してはいけないこと（Don'ts）

- ❌ `npm install` / `yarn add`（必ず `pnpm`）
- ❌ ESLint / Prettier の追加（Biome に統一）
- ❌ `expo-av` の新規利用（`expo-audio` を使う）
- ❌ `react-navigation` の手動セットアップ（`expo-router` を使う）
- ❌ Supabase `service_role_key` をクライアントに置く
- ❌ シークレットをコミット
- ❌ `plan.md` を勝手に「決定済」に昇格させる
- ❌ ハルシネーションでAPIを書く（不明なら確認）
- ❌ 大規模リファクタを「ついでに」入れる
- ❌ 1 PR に複数 issue を詰める

---

## 9. 困ったときの参照先

| 状況 | 参照 |
|---|---|
| 仕様判断に迷う | `docs/plan.md` |
| 技術選定の根拠を知りたい | `docs/tech-stack.md` |
| 過去の判断履歴 | `docs/adr/` |
| Expo の API がわからない | https://docs.expo.dev/versions/v56.0.0/ |
| Supabase の API がわからない | https://supabase.com/docs |
| AI SDK の使い方 | https://ai-sdk.dev/docs |

---

## 10. 改訂履歴
- 2026-06-22: 初版（v1.0）
