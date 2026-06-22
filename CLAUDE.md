@AGENTS.md

# Claude Code 固有ルール

## Plan Mode を活用する
- 機能追加・スキーマ変更・依存追加など影響範囲が広い変更は、**Plan Mode で計画を出してから実装** する
- Plan には以下を含める：
  - 変更ファイル一覧と意図
  - 検証方法（`pnpm typecheck` / `pnpm lint` / `pnpm test` / 実機）
  - リスク・撤退手段
  - `AGENTS.md §3.5` の AI駆動開発ループのどのステップにいるか

## 自己レビューを必ず行う
- 実装後は `AGENTS.md §5.5` のレビュー観点で自分の差分を点検
- P1 / P2 懸念があれば、ユーザーに渡す前に**自分から先に申告**する
- 「動きました」だけで終わらない

## 検索よりまず docs/ を読む
- `AGENTS.md` / `docs/plan.md` / `docs/tech-stack.md` / `docs/adr/` の確認を最優先
- 外部ドキュメントが必要な場合は WebFetch で公式版を取得（推測でAPIを書かない）

## 学習ログを残す
- 失敗・ハマり・効いたプロンプトは `docs/ai-dev-log.md` に追記
- 再発するルールは `AGENTS.md` に昇格

## サブエージェント使い分け（Task ツール利用時）
- 大きな調査 → `general-purpose`
- コードレビュー → `code-review`（修正はしない）
- 構造化された設計提案 → `rubber-duck`
- 詳細は `AGENTS.md §3.6`
