# GitHub Copilot Instructions

このリポジトリの開発ルール・コーディング規約・AIアシスタント遵守事項はすべて
[AGENTS.md](../AGENTS.md) に集約されています。

Copilot や Copilot Chat で提案を生成する前に、必ず AGENTS.md を読み、以下を守ってください：

- Expo SDK 56 の公式ドキュメントで実在するAPIだけを使う（推測禁止）
- `expo-audio` を使う（`expo-av` は禁止）
- パッケージマネージャーは **pnpm**
- Lint/Format は **Biome**（ESLint / Prettier は導入しない）
- LLM呼び出しは必ず `src/lib/ai/` の抽象インターフェース経由
- Supabase は anon key + RLS、`service_role_key` をクライアントに置かない
- 環境変数: クライアント参照には `EXPO_PUBLIC_` プレフィクス、サーバー専用キーには付けない
- 1 issue = 1 PR、コミットは Conventional Commits

詳細は AGENTS.md を参照。
