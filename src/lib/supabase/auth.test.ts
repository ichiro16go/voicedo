import { describe, expect, it } from "vitest";
import {
  InvalidEmailError,
  InvalidOtpError,
  validateEmail,
  validateOtp,
} from "./auth-validators";

describe("validateEmail", () => {
  it.each([
    ["user@example.com", "user@example.com"],
    ["  user@example.com  ", "user@example.com"],
    ["UPPER@example.com", "UPPER@example.com"],
  ])("正常: %s → %s", (input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });

  it.each(["", "not-an-email", "no-at-sign.com", "missing@", "@nodomain"])(
    "異常: %s で InvalidEmailError",
    (bad) => {
      expect(() => validateEmail(bad)).toThrow(InvalidEmailError);
    },
  );
});

describe("validateOtp", () => {
  it.each([
    ["123456", "123456"],
    ["  654321  ", "654321"],
  ])("正常: %s → %s", (input, expected) => {
    expect(validateOtp(input)).toBe(expected);
  });

  it.each(["", "12345", "1234567", "12345a", "abcdef", "12 34 56"])(
    "異常: %s で InvalidOtpError",
    (bad) => {
      expect(() => validateOtp(bad)).toThrow(InvalidOtpError);
    },
  );
});
