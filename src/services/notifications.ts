import { API_BASE_URL } from "../config/api";
import { AppNotificationRecord } from "../types/notification";

type NotificationEnvelope = {
  notifications: AppNotificationRecord[];
  message?: string;
};

type RequestMethod = "GET" | "PATCH";

async function request(
  path: string,
  token: string,
  method: RequestMethod,
) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`
        : `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`,
    );
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as NotificationEnvelope) : null;

  if (!response.ok) {
    throw new Error(
      data?.message
        ? data.message
        : `Request failed with status ${response.status}`,
    );
  }

  return data as NotificationEnvelope;
}

export async function fetchNotifications(token: string) {
  return request("/notifications", token, "GET");
}

export async function markAllNotificationsRead(token: string) {
  return request("/notifications/mark-all-read", token, "PATCH");
}
