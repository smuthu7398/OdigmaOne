import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { signIn, useSession } from "../lib/auth-client";
import { colors, radius } from "../lib/theme";

export default function LoginScreen() {
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && session) return <Redirect href="/(tabs)" />;

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await signIn.email({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(
        err.status === 401 || err.status === 403
          ? "Wrong email or password. Try again."
          : (err.message ?? "Could not reach the server.")
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Image
          source={require("../assets/odigma-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to Odigma One to manage clients and tasks.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.faint}
          secureTextEntry
          autoComplete="current-password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (busy || pressed) && { opacity: 0.8 },
          ]}
          onPress={handleSignIn}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card + 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 8,
  },
  logo: { width: 120, height: 42, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  error: {
    marginTop: 8,
    backgroundColor: "rgba(239,68,68,0.10)",
    color: colors.destructive,
    padding: 10,
    borderRadius: radius.input,
    fontSize: 13,
  },
  button: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontWeight: "700",
    fontSize: 15,
  },
});
