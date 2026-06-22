# Voicedo

> 3-5分の音声がそのままnote記事になる、対話型AI日記アプリ。

[![Stage 1](https://img.shields.io/badge/stage-1%20(self--use%20β)-blue)]() [![Status](https://img.shields.io/badge/status-WIP-orange)]()

- **対象**: 書きたいけど書けない会社員/エンジニア（メインペルソナ「田中」）
- **コア体験**: 3-5分話す → AIが質問で深掘り → 自動でMarkdown記事 → noteエディタへ
- **詳細計画**: [docs/plan.md](./docs/plan.md)
- **技術選定**: [docs/tech-stack.md](./docs/tech-stack.md)
- **学習ロードマップ**: [docs/learning-roadmap.md](./docs/learning-roadmap.md)

## クイックスタート

```bash
pnpm install
cp .env.example .env   # .env を編集して必要なキーを設定
pnpm start             # Expo Dev Server 起動
pnpm web               # Web で確認
pnpm ios               # iOS シミュレータ（要 macOS）
pnpm android           # Android エミュレータ
```

## スクリプト

| コマンド | 説明 |
|---|---|
| `pnpm start` | Expo Dev Server |
| `pnpm web` / `pnpm ios` / `pnpm android` | 各プラットフォーム起動 |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format |
| `pnpm typecheck` | TypeScript 型検査 |

## ディレクトリ構成

```
voicedo/
├─ src/
│  ├─ app/              # expo-router の画面（file-based routing）
│  ├─ components/       # UIコンポーネント（NativeWind）
│  ├─ lib/
│  │  ├─ ai/            # LLM抽象化（STT/Chat/ArticleGenerator）
│  │  ├─ audio/         # 録音まわり（expo-audio）
│  │  ├─ billing/       # Stripe / RevenueCat
│  │  └─ supabase/      # Supabase client
│  ├─ types/            # 型定義（DB型は supabase gen で再生成）
│  └─ global.css        # NativeWind 入口
├─ supabase/migrations/ # DBスキーマ
└─ docs/                # plan / tech-stack / ADR
```

## 開発ルール

開発に参加する人間 / AI は必ず [AGENTS.md](./AGENTS.md) を読んでください。
- 技術スタック・コーディング規約・PRルール
- AIアシスタント向けの遵守事項（ハルシネーション防止・公式ドキュメント参照ルール）

## ライセンス
MIT
