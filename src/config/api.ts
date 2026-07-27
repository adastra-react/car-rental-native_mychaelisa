import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_PORT = "3000";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function extractHost(candidate?: string | null) {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, "");
  const hostPort = withoutProtocol.split("/")[0] ?? "";
  const host = hostPort.split(":")[0] ?? "";

  return host || null;
}

function getExpoHostBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return stripTrailingSlash(configuredBaseUrl);
  }

  const expoHost =
    extractHost(Constants.expoConfig?.hostUri) ??
    extractHost(Constants.linkingUri) ??
    extractHost((Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost);

  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_PORT}`;
}

export const API_BASE_URL = stripTrailingSlash(getExpoHostBaseUrl());
