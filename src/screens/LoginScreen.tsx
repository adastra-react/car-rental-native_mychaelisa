import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch } from "react-redux";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AuthStackParamList } from "../AuthNavigator";
import { getBackendUrlLabel, loginUser } from "../services/auth";
import {
  authFailed,
  authStarted,
  clearAuthError,
  setSession,
} from "../store/authSlice";
import { AppDispatch } from "../store";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    setError(null);
    dispatch(clearAuthError());
    dispatch(authStarted());

    try {
      const session = await loginUser(email.trim().toLowerCase(), password);
      dispatch(setSession(session));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in right now.";
      setError(message);
      dispatch(authFailed(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View
            style={[
              styles.container,
              { paddingBottom: Math.max(insets.bottom + 24, 48) },
            ]}
          >
            <Text style={styles.eyebrow}>Mychaelisa Car Rental</Text>
            <Text style={styles.title}>Sign in to manage your account</Text>
            <Text style={styles.subtitle}>
              Step back into the same renter and owner experience waiting inside
              the app.
            </Text>

            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarBadgeText}>MT</Text>
                </View>
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>Secure sign in</Text>
                </View>
              </View>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#6F767E"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#6F767E"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={onSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.secondaryButtonText}>
                  New here? Create an account
                </Text>
              </Pressable>
            </View>

            <Text style={styles.backendNote}>
              Backend: {getBackendUrlLabel()}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#050505",
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    backgroundColor: "#050505",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#20E6A4",
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#F5F7FA",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: "#8A8F98",
    marginTop: 10,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#1C1C1C",
    shadowColor: "#20E6A4",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22381F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadgeText: {
    color: "#F5F7FA",
    fontSize: 20,
    fontWeight: "700",
  },
  verifiedPill: {
    borderRadius: 999,
    backgroundColor: "#20E6A4",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  verifiedPillText: {
    color: "#07120D",
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B8BDC7",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#2B2B2B",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#F5F7FA",
    backgroundColor: "#181818",
    marginBottom: 16,
  },
  error: {
    color: "#FF746C",
    marginBottom: 14,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#20E6A4",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#07120D",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#20E6A4",
    fontSize: 15,
    fontWeight: "600",
  },
  backendNote: {
    marginTop: 18,
    color: "#5C626B",
    fontSize: 12,
  },
});
