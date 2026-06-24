import { z } from "zod";

/**
 * Pure validators for auth inputs. Supabase クライアントを引きずらないので
 * Vitest (Node) でそのままテストできる。
 */

const emailSchema = z.string().email();
const otpSchema = z.string().regex(/^\d{6}$/, "6桁の数字を入力してください");

export class InvalidEmailError extends Error {
  override name = "InvalidEmailError";
}
export class InvalidOtpError extends Error {
  override name = "InvalidOtpError";
}

export function validateEmail(input: string): string {
  const r = emailSchema.safeParse(input.trim());
  if (!r.success) throw new InvalidEmailError("メールアドレスの形式が正しくありません");
  return r.data;
}

export function validateOtp(input: string): string {
  const r = otpSchema.safeParse(input.trim());
  if (!r.success) throw new InvalidOtpError("6桁の数字を入力してください");
  return r.data;
}
