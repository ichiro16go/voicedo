import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  InvalidEmailError,
  InvalidOtpError,
  sendOtp,
  verifyOtp,
} from "@/lib/supabase/auth";

type Step = "email" | "otp";

export function SignInForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      await sendOtp(email);
      setStep("otp");
      Alert.alert(
        "確認コードを送信しました",
        "メール内の6桁コードを入力してください。",
      );
    } catch (e) {
      if (e instanceof InvalidEmailError) {
        setError(e.message);
      } else {
        setError("送信に失敗しました。少し待って再度お試しください。");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(email, otp);
      // 成功時は AuthProvider が onAuthStateChange を受けて画面遷移
    } catch (e) {
      if (e instanceof InvalidOtpError) {
        setError(e.message);
      } else {
        setError("コードが正しくないか、有効期限切れです。もう一度お試しください。");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Voicedo へようこそ</Text>
        <Text style={styles.subtitle}>
          {step === "email"
            ? "メールアドレスを入力してください。"
            : `${email} 宛に6桁コードを送信しました。`}
        </Text>

        {step === "email" ? (
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9aa0a6"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
        ) : (
          <TextInput
            style={[styles.input, styles.otpInput]}
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            placeholderTextColor="#9aa0a6"
            keyboardType="number-pad"
            maxLength={6}
            editable={!busy}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={step === "email" ? handleSendOtp : handleVerify}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {step === "email" ? "確認コードを送る" : "ログイン"}
            </Text>
          )}
        </Pressable>

        {step === "otp" ? (
          <Pressable
            style={styles.linkButton}
            onPress={() => {
              setStep("email");
              setOtp("");
              setError(null);
            }}
            disabled={busy}
          >
            <Text style={styles.linkText}>メールアドレスを変更する</Text>
          </Pressable>
        ) : null}

        <Text style={styles.notice}>
          ログインすると、利用規約とプライバシーポリシーに同意したものとみなします。
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
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4d9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  otpInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
  },
  error: {
    color: "#c00",
    marginTop: 12,
    fontSize: 14,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#888",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    color: "#555",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  notice: {
    marginTop: 32,
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
});
