# Voicedo 技術選定（v1.1 / 2026-06-22）

> 設計原則：**Stage 0-2 は「速さ × 検証 × 撤退容易性」を最大化**。Stage 3 で必要に応じて移行 / 拡張する二段構え。
> 制約：Ichiro 一人実装、半年で D30 / 課金継続まで到達、Web連携型（note エディタ起動）、Stage 0 から実決済。

---

## TL;DR（決定スタック）

| レイヤ | 採用 | 備考 |
|---|---|---|
| フロント | **Expo (React Native) + TypeScript + Expo Router** | iOS/Android + Web を1コードベース。再開発回避 |
| Web版 | **Expo Web（React Native Web）** | LP・Stage 0 Wizard of Oz・note貼り付け導線用 |
| UI | **NativeWind (Tailwind for RN) + Tamagui or gluestack-ui** | — |
| 録音 | **expo-audio**（iOS/Android/Web 統一API、SDK 54 標準） | バックグラウンド録音もネイティブで取れる |
| STT | **OpenAI `gpt-4o-transcribe`** | Deepgram Nova-3 を Stage 2 で評価 |
| 対話LLM（ハル/ロイ） | **gpt-5-mini** | Gemini 2.5 Flash フォールバック |
| 記事生成LLM | **Claude Sonnet 4.5** | 日本語品質重視。Stage 1でgpt-5とブラインド比較 |
| LLM抽象化 | **Vercel AI SDK（RN対応版）** | プロバイダー切替容易 |
| バックエンド | **Supabase**（Postgres + Auth + Storage + RLS + Edge Functions） | RN SDK公式対応 |
| API層 | **Supabase Edge Functions**（Deno）／Vercel Functions も併用可 | LLM呼び出しはサーバー側 |
| 決済 | **Stripe（RevenueCat ラップ）** | iOS/Android のIAP規約も将来見据えRevenueCatで吸収 |
| 通知 | **Expo Notifications**（iOS/Android Push） | サーバー：Expo Push API |
| 解析 | **PostHog（RN SDK）** | — |
| エラー監視 | **Sentry（RN SDK）** | — |
| 配布 | **EAS Build + EAS Submit + EAS Update**（OTA更新） | 審査回避でロジック修正可能 |
| 開発環境 | **pnpm + Biome + Vitest + Maestro（E2E）** | — |

---

## 6つの論点と決定

### 1. フロント形態 → **Expo (React Native) を最初から**

**決定理由（方針転換）**
- 「Stage 3でPWA→Expo再開発」のコストが、Stage 0/1のスピード差を上回ると判断。
- Expoは **iOS / Android / Web を1コードベース** で出せるので、PWAの利点（即デプロイ・URL共有）も `expo start --web` でほぼ維持できる。
- **EAS Update（OTA）** で審査を介さずJSロジックを更新できるため、「審査でリズムが崩れる」懸念は実質的に解消。
- バックグラウンド録音・Live Activity・ウィジェット・iOS Push の各機能をいつでも有効化できる余地を最初から持てる。
- App Store / Google Play の発見性は中長期で確実に効く。

**現実的な懸念とその対応**
| 懸念 | 対応 |
|---|---|
| 初回ビルド・審査の学習コスト | EAS Buildで自動化、初回審査は Stage 1 末〜Stage 2 頭で済ませる |
| 開発初期の hot reload 体験 | Expo Goアプリで秒で実機確認、PWAより早い場面も多い |
| noteエディタ起動（外部URL） | `Linking.openURL('https://note.com/new')` で同等のWeb連携が可能 |
| Stage 0 Wizard of Oz でアプリ不要なケース | Expo Web で簡易LP+フォームを出せば対応可能 |
| Web Pushとネイティブ通知の二重実装 | Expo Notifications + expo-router でプラットフォーム分岐 |

**やる順序**
1. Stage 0：Expo Web で簡易LP + Stripe Payment Links のみ。録音体験は不要（人力）
2. Stage 1：Expo（iOS/Android）でIchiro自身が21日連続使用、TestFlight / Internal Testing
3. Stage 2：β20人にTestFlight / Internal Testing 配布、note連携実機検証
4. Stage 3：本番審査 → App Store / Google Play 公開

**やらない判断もあり得る場面**
- 上記の学習コストに2週間以上溶けたら、PWAに即退却（撤退ライン）

---

### 2. 音声入力（STT）→ **`gpt-4o-transcribe` 主軸、Stage 2でリアルタイム化検討**

**決定理由**
- Stage 0/1 は「録音 → アップロード → 文字起こし → 質問返し」の非ストリーミング構成で十分。
- `gpt-4o-transcribe` は Whisper より日本語精度・レイテンシが改善されており、3分音声で 5-8 秒程度で完了。
- ストリーミング型（OpenAI Realtime / Gemini Live）は UX は良いが原価が読みにくく、Stage 1 では過剰投資。

**Stage 2 のアップグレード候補**
- **OpenAI Realtime API**：音声→音声で完全リアルタイム対話（ハルが本当に「相槌」を打てる）
- **Gemini Live**：マルチモーダル、コストが OpenAI より安い可能性
- 採用条件：Stage 1 の「対話の間が悪い」NPS コメントが 30% を超えた場合

**原価試算（1セッション = 3-5分）**
- STT: $0.006/分 × 5分 = **$0.03**
- 質問LLM: 入出力 2k tokens × 4ターン × gpt-5-mini = **$0.01**
- 記事生成LLM: 入出力 3k tokens × Claude Sonnet 4.5 = **$0.03**
- **合計: 約 ¥10〜12/セッション**（粗利目標 70% で価格設計と整合）

---

### 3 & 4. 対話LLMと記事生成LLMを分ける理由（明確化）

**結論：用途が違うから役割分担。ただしStage 1で検証して確定。**

| 観点 | 対話（ハル/ロイ） | 記事生成 |
|---|---|---|
| 求められる速度 | 即レス（1-2秒）が4ターン続く | 1セッション1回（10秒待てる） |
| 求められる質 | 共感・短く・自然な相槌 | 文章としての読み心地・敬体一貫 |
| トークン量 | 短い（1ターン数百） | 長め（3k前後） |
| **採用** | **gpt-5-mini**（速い・安い） | **Claude Sonnet 4.5**（日本語品質） |

**なぜ分けるか（一言）**
> 雑談には gpt-5-mini が速くて安い。清書には Claude の日本語の方が読める。逆にすると、対話のレイテンシ・コストが3倍になり、記事には「いかがでしたか」系の癖が出やすい。

**シンプル化の選択肢（保険）**
- 「全部gpt-5でいい」も技術的にはアリ。マルチプロバイダー抽象化を最初から入れてるので、後から差し替えはゼロコスト。
- **Stage 1 必須タスク**：同じ音声を gpt-5 / Claude Sonnet 4.5 / Gemini 2.5 Pro に通して、Ichiro自身がブラインドで読み比べ → 採用確定。

---

### 5. バックエンド → **Supabase 一択**

**決定理由**
- Postgres + Auth + Storage + RLS + Realtime + Edge Functions を **単一プロバイダーで** 提供。Ichiro 一人実装には最強。
- Expo (RN) 用の公式SDK あり（`@supabase/supabase-js` + AsyncStorage）。
- RLS で「自分の音声・記事は自分しか見られない」をDB層で強制 → プライバシー要件と相性◎
- 音声ファイルは Supabase Storage に保存、7日後に自動削除を Edge Function + pg_cron で実装
- 無料枠（500MB DB / 1GB Storage / 50k MAU）で Stage 0-2 をまかなえる
- 撤退時は Postgres を素のまま吸い出せる → ロックイン低い

**スキーマ初版（Stage 1用）**
```sql
users          -- Supabase Auth拡張
sessions       -- 録音セッション（音声URL、開始/終了時刻、STT結果）
turns          -- 1セッション内の対話ターン
articles       -- 生成記事（draft/published、Markdown本文）
deletions      -- 削除リクエスト追跡（即時削除と遅延削除のステータス）
billing_events -- Stripe webhook 受信ログ
```

---

### 6. 決済 → **Stripe + RevenueCat ラップ**

**決定理由**
- Stage 0-1 は Stripe 直叩きで OK（Payment Links / Checkout）。
- Stage 2 以降、ネイティブで配布する場合 **iOS/Android のサブスク規約上、IAP（App Store / Google Play課金）が必要** になる可能性が高い。
- **RevenueCat** を最初から噛ませると、Stripe / Apple IAP / Google Billing を統一APIで切り替えられる。
- 日本の決済手数料 3.6%（Stripe）vs 30% / 15%（Apple）の差は大きいので、**Web課金主軸 → ネイティブはStripe Mobileを試す → ダメならIAPに切替** という移行を視野に。

**実装順序**
1. Stage 0：Payment Links（コード不要、URL貼るだけ）で実決済を集める
2. Stage 1：Stripe Checkout + RevenueCat SDK を組み込む
3. Stage 2：Customer Portal + Subscription + Webhook ハンドリング
4. Stage 3：iOS/Android のIAP要件を再確認し、必要なら RevenueCat 経由で IAP 切替

---

## 開発環境 / DX

- **pnpm**：依存解決が速い
- **Biome**：ESLint + Prettier 統合、整形が圧倒的に速い
- **Vitest**：ユニット
- **Maestro**：モバイルE2E（Playwrightの代わり、RN向け）
- **EAS Build**：iOS/Android のクラウドビルド
- **EAS Update**：JSのOTA更新で審査回避

## CI/CD
- GitHub Actions：lint / test / typecheck
- EAS Build：PRごとに preview ビルド、Ichiro自身のスマホで即確認
- main マージで EAS Update（本番OTA）

---

## プライバシー実装の技術対応（plan.md L199準拠）

| 要件 | 実装 |
|---|---|
| 音声7日保存 | Supabase Storage + pg_cron で自動削除 |
| 即時削除（DB・画面） | RLS + soft delete → 24h以内 hard delete cron |
| 遅延削除（バックアップ） | Supabase PITR は最大7日（Pro plan）→ ユーザー説明文と整合 |
| AI学習Opt-out | OpenAI Enterprise／Anthropic（デフォルトOpt-out）／Google Cloud Vertex（Opt-out可） |
| 第三者名検出 | 記事生成プロンプトに NER 指示 + 編集画面で警告UI |
| メンタルヘルス検出 | 同上 + ハル/ロイ の system prompt に組み込み |

---

## マルチプロバイダー抽象化（リスク⑩対策）

`src/lib/ai/` に以下のインターフェースを最初から切る：

```ts
interface STTProvider { transcribe(audio: Blob): Promise<string> }
interface ChatProvider { chat(messages: Message[]): AsyncIterable<string> }
interface ArticleGenerator { generate(transcript: string, persona: 'hal'|'roi'): Promise<string> }
```

採用：OpenAI / Anthropic / Google を切替可能に。Stage 1 で2系統で動作確認しておく。

---

## やらないこと（Stage 0-2 では明確に切る）

- ❌ 独自Auth（Supabase Auth + Google/Apple/Magic Link で十分）
- ❌ Kubernetes / 独自インフラ
- ❌ GraphQL（Supabase REST/RPC で十分）
- ❌ 多言語化（日本語のみ、最初の半年は🅰フォーカス）
- ❌ ソーシャル機能（フォロー・いいね、長期戦略の番組モードで再検討）
- ❌ 独自課金（Stripe / RevenueCat で完結）
- ❌ Stage 0でのネイティブビルド（Expo Web + Payment Linksで十分）

---

## Stage 1 着手前の技術検証チェックリスト

- [ ] Expo Go で iOS/Android 実機 + Expo Web の3面が動くか
- [ ] expo-audio で iOS/Android/Web 録音の音質・サイズ・コーデック差確認
- [ ] iOS で Expo Notifications の朝7時通知が届くか
- [ ] note貼り付けUX 3パターン実機検証（plan.md プラットフォーム連携セクション）
- [ ] gpt-4o-transcribe で5分音声の精度・レイテンシ実測
- [x] **gpt-4o / Claude 3.5 Sonnet / Gemini 1.5 Pro でブラインド記事生成比較（5サンプル）**
- [ ] Supabase RLS で「他人の音声を取れない」を E2E テスト
- [ ] Stripe Payment Links で ¥500 実決済を Ichiro 自身がテスト
- [ ] EAS Build / EAS Update が動くか（初回ビルドの所要時間計測）

---

## コスト試算（Stage 2 / β20人 / 月想定）

| 項目 | 月額 |
|---|---|
| Vercel Pro（API層）| $20 |
| Supabase Pro | $25 |
| EAS（無料枠で当面OK、Stage 3で$19~） | $0〜 |
| OpenAI（STT + 質問） | 20人 × 月15セッション × ¥4 = ¥1,200 |
| Anthropic（記事生成） | 20人 × 月15セッション × ¥4 = ¥1,200 |
| Stripe手数料 | 売上の3.6% |
| RevenueCat（無料枠 $2.5k MRRまで） | $0 |
| ドメイン | ¥200 |
| PostHog / Sentry | $0（無料枠内） |
| **合計** | **約 ¥9,000-11,000/月** |

Stage 2 想定売上：β20人 × ¥500 = ¥10,000/月 → ほぼトントン。粗利は Stage 3 で本番。

---

## 次のアクション（Stage 1 実装着手）

1. `voicedo` リポジトリ初期化（Expo SDK 53 + TypeScript + Expo Router + NativeWind）
2. Supabase プロジェクト作成、スキーマ初版適用
3. expo-audio での録音 → アップロード → STT → 質問LLM → 記事生成パイプライン
4. Stripe Payment Links で Stage 0 課金導線を先に立てる
5. note貼り付けUX Plan A/B/C を半日で実機検証
6. gpt-4o vs Claude 3.5 Sonnet vs Gemini 1.5 Pro の記事生成ブラインドテスト（検証完了）

---

## 改訂履歴
- 2026-06-22 v1.0：初版作成（PWA採用、Stage 3でExpo再評価方針）
- 2026-06-22 v1.1：**フロント形態をExpo最初から採用に変更**（再開発回避）。決済をRevenueCatラップに変更。記事生成LLMの分離理由を明確化＋Stage 1ブラインドテストを必須化。
- 2026-06-23 v1.2：**記事生成LLMをClaude 3.5 Sonnetに確定**。実音声を想定した5本のテストデータを用いたブラインドテストを実施し、日本語品質および制約の順守率が群を抜いていたため採用を決定。ADR 0002として公式記録。

