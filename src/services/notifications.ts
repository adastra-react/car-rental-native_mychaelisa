import { API_BASE_URL } from "../config/api";
import { fetchWithTimeout } from "./httpClient";
import { AppNotificationRecord } from "../types/notification";
import { NotificationPreferences } from "../types/auth";

type NotificationEnvelope = {
  notifications: AppNotificationRecord[];
  message?: string;
};

type NotificationPreferencesEnvelope = {
  notificationPreferences: NotificationPreferences;
  message?: string;
};

type OkEnvelope = {
  ok: true;
  message?: string;
};

type RequestMethod = "GET" | "PATCH" | "POST" | "DELETE";

async function request<TResponse>(
  path: string,
  token: string,
  method: RequestMethod,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`
        : `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`,
    );
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as { message?: string }) : null;

  if (!response.ok) {
    throw new Error(
      data?.message
        ? data.message
        : `Request failed with status ${response.status}`,
    );
  }

  return data as TResponse;
}

export async function fetchNotifications(token: string) {
  return request<NotificationEnvelope>("/notifications", token, "GET");
}

export async function markAllNotificationsRead(token: string) {
  return request<NotificationEnvelope>(
    "/notifications/mark-all-read",
    token,
    "PATCH",
  );
}

export async function registerPushToken(token: string, pushToken: string) {
  return request<OkEnvelope>("/notifications/push-token", token, "POST", {
    token: pushToken,
  });
}

export async function unregisterPushToken(token: string, pushToken: string) {
  return request<OkEnvelope>("/notifications/push-token", token, "DELETE", {
    token: pushToken,
  });
}

export async function saveNotificationPreferences(
  token: string,
  preferences: NotificationPreferences,
) {
  return request<NotificationPreferencesEnvelope>(
    "/notifications/preferences",
    token,
    "PATCH",
    preferences,
  );
}

export async function sendTestNotification(token: string) {
  return request<OkEnvelope>("/notifications/test", token, "POST");
}
