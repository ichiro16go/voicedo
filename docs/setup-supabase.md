# Supabase セットアップ手順

> 対象: Voicedo Supabase プロジェクトを CLI で本リポジトリに紐付け、初期 migration を適用、DB 型を生成、RLS の動作確認まで。

## 前提
- Supabase プロジェクトは **作成済み** (Dashboard 上に存在)
- `supabase` CLI が入っている（このリポは `2.106+` を想定）
- `pnpm install` 済み

## 1. プロジェクト情報を控える

Supabase Dashboard → 対象プロジェクト → 「Project Settings」で以下を控える：

| 名前 | 場所 |
|---|---|
| **Project URL** | Settings → API → `Project URL` |
| **anon public key** | Settings → API → `Project API keys` → `anon public` |
| **service_role key** | 同上の `service_role`（⚠ クライアントに絶対に置かない） |
| **Project ref** | Settings → General → `Reference ID`（URL の `https://<ref>.supabase.co` の `<ref>` 部分） |
| **DB password** | プロジェクト作成時に設定した DB パスワード |

## 2. `.env` を作る（コミットされない）

```bash
cp .env.example .env
```

`.env` を開いて、以下の3つだけ最低限埋める（残りは後で）：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # サーバー側のみで使う
```

## 3. Supabase CLI ログイン & プロジェクト連携

```bash
# 初回のみ。ブラウザが開いてアクセストークンが発行される
supabase login

# 本リポジトリを対象プロジェクトに紐付け
supabase link --project-ref <project-ref>
# → DB パスワードを聞かれるので入力
```

## 4. 初期 migration 適用

```bash
# まず差分を確認（dry run）
supabase db diff --linked

# OK なら反映
supabase db push
```

期待: `supabase/migrations/0001_init.sql` が本番 DB に反映され、5 テーブル + RLS ポリシーが作成される。

## 5. DB 型を生成（`src/types/database.ts` を上書き）

```bash
supabase gen types typescript --linked > src/types/database.ts
```

> 注意: 既存の stub 型定義が上書きされます。問題なし（CLI 生成物が正）。

## 6. RLS の動作確認

### 6.1 SQL で構造確認
Supabase Dashboard → SQL Editor で以下を実行：

```bash
# 内容は supabase/tests/rls_sanity.sql 参照
```

各テーブルで `rls_enabled = true`、`policy_count >= 1` であること。

### 6.2 アプリ側で疎通テスト
`.env` を読み込みつつ vitest を回す：

```bash
pnpm test
```

`src/lib/supabase/rls.test.ts` が走り、**匿名ユーザーが各テーブルを select / insert できない**ことを確認する（環境変数が無ければスキップ）。

## 7. Storage バケットの作成

音声ファイル保存用バケットを作る。Dashboard → Storage で：

| バケット名 | Public | 説明 |
|---|---|---|
| `voicedo-audio` | **No (Private)** | 音声録音（7日後に自動削除予定） |

CLI でやるなら：
```bash
# 後日 Edge Function or SQL でバケット作成 + lifecycle 設定
```

## 8. 完了チェック
- [ ] `.env` 作成済み、git status に出ない
- [ ] `supabase link` 成功
- [ ] `supabase db push` 成功（migrationが反映）
- [ ] `src/types/database.ts` が CLI で再生成された
- [ ] `pnpm test` が PASS（RLSテスト含む）
- [ ] Storage バケット `voicedo-audio` が Private で存在

---

## 困ったとき
- `supabase link` でエラー: `--debug` 付きで再実行
- 型生成で `Error: missing project ref`: `supabase link` がまだ。再リンク
- RLSテストが想定外に通る: ポリシーが緩い可能性、`supabase/migrations/0001_init.sql` を見直し
