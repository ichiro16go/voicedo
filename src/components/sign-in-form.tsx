import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AppleSignInCancelledError,
  AppleSignInUnavailableError,
  GoogleSignInCancelledError,
  signInWithApple,
  signInWithGoogle,
} from "@/lib/supabase/auth";

export function SignInForm() {
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle();
      // AuthProvider が onAuthStateChange で遷移
    } catch (e) {
      if (e instanceof GoogleSignInCancelledError) {
        // ユーザー操作によるキャンセルはエラー表示しない
      } else {
        setError("Google サインインに失敗しました。時間を置いて再度お試しください。");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleApple = async () => {
    setError(null);
    setBusy("apple");
    try {
      await signInWithApple();
    } catch (e) {
      if (e instanceof AppleSignInCancelledError) {
        // 何もしない
      } else if (e instanceof AppleSignInUnavailableError) {
        Alert.alert("利用不可", e.message);
      } else {
        setError("Apple サインインに失敗しました。時間を置いて再度お試しください。");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Voicedo へようこそ</Text>
        <Text style={styles.subtitle}>
          話すだけで、書ける。{"\n"}まずはサインインしてください。
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.googleButton, busy && styles.buttonDisabled]}
          onPress={handleGoogle}
          disabled={busy !== null}
        >
          {busy === "google" ? (
            <ActivityIndicator color="#3c4043" />
          ) : (
            <Text style={styles.googleText}>Google で続ける</Text>
          )}
        </Pressable>

        {Platform.OS === "ios" ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={10}
            style={styles.appleButton}
            onPress={handleApple}
          />
        ) : null}

        <Text style={styles.notice}>
          サインインすると、利用規約とプライバシーポリシーに同意したものとみなします。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
    marginBottom: 32,
    lineHeight: 22,
  },
  error: {
    color: "#c00",
    marginBottom: 16,
    fontSize: 14,
  },
  googleButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dadce0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  googleText: {
    color: "#3c4043",
    fontSize: 16,
    fontWeight: "600",
  },
  appleButton: {
    height: 48,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  notice: {
    marginTop: 32,
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
});
