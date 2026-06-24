import type { Session } from "@supabase/supabase-js";
import { validateEmail, validateOtp } from "./auth-validators";
import { supabase } from "./client";

/**
 * Auth helpers: Supabase Email OTP (6桁コード) フロー
 * 関連 Issue: #12
 *
 * 設計:
 * - バリデーションは `./auth-validators` の純粋関数に分離（テスタブル）
 * - 例外は意味のあるエラークラスで握る（呼び出し側で UI 振り分け）
 * - email / OTP コードは絶対に console.log しない（AGENTS §5.5）
 */

export {
  InvalidEmailError,
  InvalidOtpError,
  validateEmail,
  validateOtp,
} from "./auth-validators";

export class OtpSendError extends Error {
  override name = "OtpSendError";
}
export class OtpVerifyError extends Error {
  override name = "OtpVerifyError";
}

/**
 * メアド宛に 6桁 OTP を送信する。
 * Supabase の signInWithOtp は Magic Link / 6桁コード両方を含むメールを送る。
 */
export async function sendOtp(email: string): Promise<void> {
  const valid = validateEmail(email);
  const { error } = await supabase.auth.signInWithOtp({
    email: valid,
    options: { shouldCreateUser: true },
  });
  if (error) throw new OtpSendError(error.message);
}

/**
 * 6桁 OTP を検証してセッションを確立する。
 */
export async function verifyOtp(email: string, token: string): Promise<Session> {
  const validEmail = validateEmail(email);
  const validToken = validateOtp(token);
  const { data, error } = await supabase.auth.verifyOtp({
    email: validEmail,
    token: validToken,
    type: "email",
  });
  if (error) throw new OtpVerifyError(error.message);
  if (!data.session)
    throw new OtpVerifyError("認証に成功しましたがセッションが取得できませんでした");
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("signOut failed:", error.message);
  }
}
