# Contributing to Voicedo

このリポジトリへの貢献ありがとうございます。
**作業を始める前に必ず [AGENTS.md](./AGENTS.md) を読んでください。**

## 開発フロー（要約）

1. issue を1つ選ぶ（または作る）
2. ブランチ作成: `feat/<scope>-<desc>` など（AGENTS.md §5.1）
3. 実装 → `pnpm typecheck && pnpm lint` を通す
4. Conventional Commits でコミット
5. **1 issue = 1 PR** で送る
6. PR 本文に「関連 issue」「検証内容」「リスク」を書く

## 環境セットアップ

```bash
pnpm install
cp .env.example .env  # 値を埋める
pnpm start
```

## してはいけないこと

詳細は [AGENTS.md §8](./AGENTS.md#8-してはいけないことdonts) を参照。要点だけ:

- `npm` / `yarn` を使わない（`pnpm` のみ）
- ESLint / Prettier を追加しない（Biome に統一）
- `expo-av` を使わない（`expo-audio`）
- シークレットをコミットしない

## 質問・議論
issue または discussion へ。
