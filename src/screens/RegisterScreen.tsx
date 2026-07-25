import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch } from "react-redux";

import { AuthStackParamList } from "../AuthNavigator";
import { registerUser } from "../services/auth";
import {
  authFailed,
  authStarted,
  clearAuthError,
  setSession,
} from "../store/authSlice";
import { AppDispatch } from "../store";
import { UserRole } from "../types/auth";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const PUBLIC_ROLES: Exclude<UserRole, "Admin">[] = ["Renter", "Owner"];

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"Owner" | "Renter">("Renter");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignUp = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    dispatch(clearAuthError());
    dispatch(authStarted());

    try {
      const session = await registerUser({
        email: email.trim().toLowerCase(),
        password,
        role,
        name: name.trim() || undefined,
      });
      dispatch(setSession(session));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create your account.";
      setError(message);
      dispatch(authFailed(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.eyebrow}>Profile Access</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Match the same green-and-black app shell from the first screen of
            the journey.
          </Text>

          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerEyebrow}>Account role</Text>
                <Text style={styles.headerTitle}>Choose your starting mode</Text>
              </View>
            </View>

            <View style={styles.roleRow}>
              {PUBLIC_ROLES.map((option) => {
                const selected = option === role;
                return (
                  <Pressable
                    key={option}
                    style={[styles.roleChip, selected && styles.roleChipSelected]}
                    onPress={() => setRole(option)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        selected && styles.roleChipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="How should we address you?"
              placeholderTextColor="#6F767E"
              value={name}
              onChangeText={setName}
            />

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
              placeholder="At least 8 characters"
              placeholderTextColor="#6F767E"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#6F767E"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={onSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.secondaryButtonText}>
                Already have an account? Sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050505",
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "#050505",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#20E6A4",
    marginBottom: 8,
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
  },
  headerRow: {
    marginBottom: 18,
  },
  headerEyebrow: {
    color: "#8A8F98",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: "#F5F7FA",
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B8BDC7",
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  roleChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#181818",
  },
  roleChipSelected: {
    borderColor: "#20E6A4",
    backgroundColor: "#0E2A20",
  },
  roleChipText: {
    color: "#B8BDC7",
    fontWeight: "600",
  },
  roleChipTextSelected: {
    color: "#20E6A4",
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
});
