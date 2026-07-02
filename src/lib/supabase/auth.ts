import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

/**
 * Auth helpers: Google OAuth + Apple Sign-in (ネイティブ ID Token フロー)
 * 関連 Issue: #14（OAuth 移行）
 *
 * 設計:
 * - 各プロバイダから取得した ID Token を `supabase.auth.signInWithIdToken` に渡す
 *   ことで Supabase 側にリダイレクトを挟まず、純粋ネイティブで完結する
 * - email/OTP は廃止（legacy）
 * - id_token / access_token / user 情報は console.log しない（AGENTS §5.5）
 * - Apple Sign-in は iOS のみ（Android は将来的に Web OAuth フロー検討）
 */

export class GoogleSignInError extends Error {
  override name = "GoogleSignInError";
}
export class GoogleSignInCancelledError extends Error {
  override name = "GoogleSignInCancelledError";
}
export class AppleSignInError extends Error {
  override name = "AppleSignInError";
}
export class AppleSignInCancelledError extends Error {
  override name = "AppleSignInCancelledError";
}
export class AppleSignInUnavailableError extends Error {
  override name = "AppleSignInUnavailableError";
}

/**
 * GoogleSignin を初期化する。
 * App 起動時 (root layout の useEffect) で 1 度だけ呼ぶ。
 *
 * - webClientId: Google Cloud Console で作った **Web** OAuth Client ID。
 *   Supabase の signInWithIdToken は audience として Web Client ID を期待するため必須。
 * - iosClientId: iOS 用 OAuth Client ID（iOS bundleId と紐付け）。Android では不要。
 */
export function configureGoogleSignIn(): void {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId) {
    throw new Error(
      "Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. See docs/auth-setup.md",
    );
  }
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: false,
  });
}

/**
 * Google でサインイン → ID Token を Supabase に渡してセッション確立。
 */
export async function signInWithGoogle(): Promise<Session> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type === "cancelled") {
      throw new GoogleSignInCancelledError("サインインがキャンセルされました");
    }
    const idToken = res.data.idToken;
    if (!idToken) {
      throw new GoogleSignInError("Google から ID Token を取得できませんでした");
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw new GoogleSignInError(error.message);
    if (!data.session) {
      throw new GoogleSignInError(
        "認証成功しましたがセッションが取得できませんでした",
      );
    }
    return data.session;
  } catch (e) {
    if (e instanceof GoogleSignInCancelledError) throw e;
    if (e instanceof GoogleSignInError) throw e;
    const code = (e as { code?: string }).code;
    if (
      code === statusCodes.SIGN_IN_CANCELLED ||
      code === statusCodes.IN_PROGRESS
    ) {
      throw new GoogleSignInCancelledError("サインインがキャンセルされました");
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GoogleSignInError(
        "Google Play 開発者サービスが利用できません。端末を更新してください。",
      );
    }
    throw new GoogleSignInError("Google サインインに失敗しました");
  }
}

/**
 * Apple でサインイン → identityToken を Supabase に渡してセッション確立。
 * iOS のみで利用可能（Android は Apple Sign-in をネイティブで使えない）。
 */
export async function signInWithApple(): Promise<Session> {
  if (Platform.OS !== "ios") {
    throw new AppleSignInUnavailableError(
      "Apple サインインは iOS のみ対応しています",
    );
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new AppleSignInUnavailableError(
      "この端末では Apple サインインを利用できません（iOS 13+ が必要）",
    );
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const idToken = credential.identityToken;
    if (!idToken) {
      throw new AppleSignInError("Apple から identityToken を取得できませんでした");
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });
    if (error) throw new AppleSignInError(error.message);
    if (!data.session) {
      throw new AppleSignInError(
        "認証成功しましたがセッションが取得できませんでした",
      );
    }
    return data.session;
  } catch (e) {
    if (e instanceof AppleSignInError) throw e;
    const code = (e as { code?: string }).code;
    // iOS Apple: ERR_REQUEST_CANCELED が cancelled
    if (code === "ERR_REQUEST_CANCELED") {
      throw new AppleSignInCancelledError(
        "サインインがキャンセルされました",
      );
    }
    throw new AppleSignInError("Apple サインインに失敗しました");
  }
}

export async function signOut(): Promise<void> {
  try {
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
  } catch {
    // best-effort: Supabase からは必ずサインアウトする
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("signOut failed:", error.message);
  }
}
