# 認証セットアップ手順（Google OAuth + Apple Sign-in）

> 関連: PR (Email OTP → Google/Apple 移行)
> コード側は実装済み。以下の外部設定を行うと実機で動作する。

---

## 0. 前提

- bundleId / package name: `com.ichiro16go.voicedo`（iOS / Android 共通）
- アプリスキーム: `voicedo`（`app.json` の `scheme`）
- Supabase project: 既存（`EXPO_PUBLIC_SUPABASE_URL` を参照）

---

## 1. Google Cloud Console — OAuth 2.0 Client IDs

https://console.cloud.google.com/apis/credentials

新規プロジェクト or 既存プロジェクトで OAuth 同意画面を構成（**External**, スコープは email / profile / openid）。

以下 3 種類の **OAuth 2.0 クライアント ID** を作成する：

### 1.1 Web application（必須・Supabase の audience）
- 名前: `Voicedo Web (Supabase audience)`
- 認証済みリダイレクト URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- 作成後の **Client ID** を控える → `.env` の `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Client Secret を控える → Supabase Dashboard に投入（後述）

### 1.2 iOS
- 名前: `Voicedo iOS`
- Bundle ID: `com.ichiro16go.voicedo`
- 作成後の **Client ID** を控える → `.env` の `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `iOS URL scheme`（Client ID の reverse 表記）も控える → 後で `app.json` に追加

### 1.3 Android
- 名前: `Voicedo Android`
- パッケージ名: `com.ichiro16go.voicedo`
- SHA-1 署名証明書: **EAS Build 後に取得**できる。手順:
  ```bash
  eas credentials  # Android → keystore → Download → keytool で SHA-1 取得
  # または
  eas build:list で対象 build のページから keystore SHA-1 を確認
  ```
- Client ID は **コード側では使わない**（Android はパッケージ名 + SHA-1 で識別）

---

## 2. Supabase Dashboard — Google Provider 有効化

Authentication → Providers → Google

- Enable: ON
- **Client ID (for OAuth)**: 1.1 の Web Client ID
- **Client Secret (for OAuth)**: 1.1 の Web Client Secret
- **Authorized Client IDs** (signInWithIdToken 用): カンマ区切りで以下を全て記入
  ```
  <web client id>,<ios client id>,<android client id>
  ```
- Save

---

## 3. Apple Developer 設定（契約後）

### 3.1 App ID 設定
- Identifiers → 既存の `com.ichiro16go.voicedo` を選択（無ければ作成）
- Capabilities: **Sign In with Apple** を有効化 → Save

### 3.2 Service ID 作成（Supabase に渡す）
- Identifiers → 新規 → Services IDs
- Identifier: `com.ichiro16go.voicedo.signin`（命名は任意）
- Sign In with Apple → Configure
  - Primary App ID: 上記 App ID
  - Domains: `<your-project-ref>.supabase.co`
  - Return URLs: `https://<your-project-ref>.supabase.co/auth/v1/callback`

### 3.3 Sign in with Apple Key（.p8）作成
- Keys → 新規 → "Sign in with Apple" にチェック → Configure で Primary App ID 選択
- **Key ID** を控える
- **Team ID** を控える（右上 Account メンバーシップ）
- ダウンロードした `.p8` ファイル（**1度しか取得不可**）を厳重保管

### 3.4 Supabase Dashboard — Apple Provider 有効化
Authentication → Providers → Apple
- Enable: ON
- **Client ID**: Service ID（`com.ichiro16go.voicedo.signin`）
- **Secret Key (for OAuth)**: `.p8` の中身
- **Key ID** / **Team ID**: 控えた値
- **Authorized Client IDs**: アプリの bundleId `com.ichiro16go.voicedo`（iOS ネイティブ Sign in with Apple は bundleId が audience）
- Save

---

## 4. EAS Build セットアップ

```bash
# 初回のみ
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
# (eas.json は既にコミット済み)
```

### 4.1 Dev Build (Android APK)
```bash
pnpm dlx eas-cli@latest build --profile development --platform android
```
完了後ダウンロード URL から APK を端末にインストール。
以後 `pnpm start` → QR 読み込みで Expo Go の代わりに **このカスタム dev client** で起動する。

### 4.2 Dev Build (iOS)
```bash
pnpm dlx eas-cli@latest build --profile development --platform ios
```
- Apple Developer 契約後に実行
- 内部配布なら ad-hoc プロビジョニング自動セットアップに任せる

---

## 5. 動作確認チェックリスト

- [ ] `.env` に Google Web/iOS Client ID 投入
- [ ] Supabase Dashboard で Google provider enable + Authorized Client IDs 記入
- [ ] EAS Dev Build (Android) を端末にインストール
- [ ] `pnpm start` → Dev client で起動 → 「Google で続ける」→ 成功してホーム遷移
- [ ] (iOS) EAS Dev Build (iOS) を端末にインストール → 「Sign in with Apple」→ 成功

---

## トラブルシュート

- **"Authorized Client IDs" mismatch**: signInWithIdToken のエラー → Supabase Dashboard に audience が登録されていない
- **PLAY_SERVICES_NOT_AVAILABLE**: 端末の Google Play サービスが古い／無効化されている（Huawei 端末や Genymotion 等）
- **Apple "ERR_INVALID_RESPONSE"**: Key ID / Team ID / Service ID が Supabase 側と一致していない
- **Expo Go では動かない**: ネイティブ Sign-in は Expo Go では使えない。必ず EAS Dev Build を使う
