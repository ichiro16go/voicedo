import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---
const signInWithIdTokenMock = vi.fn();
const supabaseSignOutMock = vi.fn();
vi.mock("./client", () => ({
  supabase: {
    auth: {
      signInWithIdToken: (...args: unknown[]) =>
        signInWithIdTokenMock(...args),
      signOut: (...args: unknown[]) => supabaseSignOutMock(...args),
    },
  },
}));

const gHasPlayServices = vi.fn();
const gSignIn = vi.fn();
const gHasPrev = vi.fn();
const gSignOut = vi.fn();
const gConfigure = vi.fn();
vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    hasPlayServices: (...a: unknown[]) => gHasPlayServices(...a),
    signIn: (...a: unknown[]) => gSignIn(...a),
    hasPreviousSignIn: (...a: unknown[]) => gHasPrev(...a),
    signOut: (...a: unknown[]) => gSignOut(...a),
    configure: (...a: unknown[]) => gConfigure(...a),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
}));

const appleIsAvailable = vi.fn();
const appleSignIn = vi.fn();
vi.mock("expo-apple-authentication", () => ({
  isAvailableAsync: (...a: unknown[]) => appleIsAvailable(...a),
  signInAsync: (...a: unknown[]) => appleSignIn(...a),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// Force iOS for Apple tests by default; individual tests can override
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import {
  AppleSignInCancelledError,
  AppleSignInError,
  AppleSignInUnavailableError,
  configureGoogleSignIn,
  GoogleSignInCancelledError,
  GoogleSignInError,
  signInWithApple,
  signInWithGoogle,
  signOut,
} from "./auth";

const fakeSession = { access_token: "a", user: { id: "u1" } };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "web-client-id";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client-id";
});
afterEach(() => {
  delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
});

describe("configureGoogleSignIn", () => {
  it("env が揃っていれば configure される", () => {
    configureGoogleSignIn();
    expect(gConfigure).toHaveBeenCalledWith({
      webClientId: "web-client-id",
      iosClientId: "ios-client-id",
      offlineAccess: false,
    });
  });
  it("webClientId 未設定なら throw", () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    expect(() => configureGoogleSignIn()).toThrow(/GOOGLE_WEB_CLIENT_ID/);
  });
});

describe("signInWithGoogle", () => {
  it("成功時に Supabase セッションを返す", async () => {
    gHasPlayServices.mockResolvedValue(true);
    gSignIn.mockResolvedValue({ type: "success", data: { idToken: "tok" } });
    signInWithIdTokenMock.mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    });
    const s = await signInWithGoogle();
    expect(s).toBe(fakeSession);
    expect(signInWithIdTokenMock).toHaveBeenCalledWith({
      provider: "google",
      token: "tok",
    });
  });
  it("ユーザーキャンセルは GoogleSignInCancelledError", async () => {
    gHasPlayServices.mockResolvedValue(true);
    gSignIn.mockResolvedValue({ type: "cancelled" });
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(
      GoogleSignInCancelledError,
    );
  });
  it("idToken 取得不能は GoogleSignInError", async () => {
    gHasPlayServices.mockResolvedValue(true);
    gSignIn.mockResolvedValue({ type: "success", data: { idToken: null } });
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInError);
  });
  it("Supabase エラーは GoogleSignInError", async () => {
    gHasPlayServices.mockResolvedValue(true);
    gSignIn.mockResolvedValue({ type: "success", data: { idToken: "tok" } });
    signInWithIdTokenMock.mockResolvedValue({
      data: { session: null },
      error: { message: "invalid token" },
    });
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInError);
  });
});

describe("signInWithApple", () => {
  it("成功時に Supabase セッションを返す", async () => {
    appleIsAvailable.mockResolvedValue(true);
    appleSignIn.mockResolvedValue({ identityToken: "apl" });
    signInWithIdTokenMock.mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    });
    const s = await signInWithApple();
    expect(s).toBe(fakeSession);
    expect(signInWithIdTokenMock).toHaveBeenCalledWith({
      provider: "apple",
      token: "apl",
    });
  });
  it("isAvailableAsync が false なら AppleSignInUnavailableError", async () => {
    appleIsAvailable.mockResolvedValue(false);
    await expect(signInWithApple()).rejects.toBeInstanceOf(
      AppleSignInUnavailableError,
    );
  });
  it("ユーザーキャンセル (ERR_REQUEST_CANCELED) は AppleSignInCancelledError", async () => {
    appleIsAvailable.mockResolvedValue(true);
    const err = Object.assign(new Error("cancel"), {
      code: "ERR_REQUEST_CANCELED",
    });
    appleSignIn.mockRejectedValue(err);
    await expect(signInWithApple()).rejects.toBeInstanceOf(
      AppleSignInCancelledError,
    );
  });
  it("identityToken 取得不能は AppleSignInError", async () => {
    appleIsAvailable.mockResolvedValue(true);
    appleSignIn.mockResolvedValue({ identityToken: null });
    await expect(signInWithApple()).rejects.toBeInstanceOf(AppleSignInError);
  });
});

describe("signOut", () => {
  it("Google にサインイン済なら Google + Supabase 両方サインアウト", async () => {
    gHasPrev.mockReturnValue(true);
    gSignOut.mockResolvedValue(null);
    supabaseSignOutMock.mockResolvedValue({ error: null });
    await signOut();
    expect(gSignOut).toHaveBeenCalled();
    expect(supabaseSignOutMock).toHaveBeenCalled();
  });
  it("Google 未サインインなら Supabase だけサインアウト", async () => {
    gHasPrev.mockReturnValue(false);
    supabaseSignOutMock.mockResolvedValue({ error: null });
    await signOut();
    expect(gSignOut).not.toHaveBeenCalled();
    expect(supabaseSignOutMock).toHaveBeenCalled();
  });
});
