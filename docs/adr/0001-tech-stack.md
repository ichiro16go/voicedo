# ADR 0001: 技術選定 v1.1

- 状態: Accepted (2026-06-22)
- 関連: [tech-stack.md](../tech-stack.md), [plan.md](../plan.md)

## 決定
Expo (RN + Web) / Supabase / Vercel AI SDK / gpt-4o-transcribe / gpt-5-mini / Claude Sonnet 4.5 / Stripe + RevenueCat / PostHog / Sentry / Biome / pnpm。

## 文脈
- 一人実装、半年で D30 と課金継続まで到達したい
- noteエディタは外部Webで起動するため、ネイティブ優位は薄い
- ただし Stage 3 で App Store / Google Play 配布が事業上必要になる可能性が高い
- 「Stage 3でPWA→Expo再開発」を避けたい

## 結果
- Expo Web で Stage 0 LP / Wizard of Oz、Expo iOS/Android で Stage 1 以降
- EAS Update（OTA）で審査スキップしてJS更新可能
- マルチプロバイダー抽象化（`src/lib/ai/types.ts`）を初日から実装
- ハル/ロイ の役割分担は仮説。Stage 1 でブラインド検証して確定

## 撤退条件
- Expoの学習コストに2週間以上溶けたら PWA に即退却
- 主要ライブラリの Expo SDK 56 互換性破綻が3つ以上見つかったら見直し
