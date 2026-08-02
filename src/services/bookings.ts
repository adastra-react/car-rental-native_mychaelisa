import { API_BASE_URL } from "../config/api";
import { fetchWithTimeout } from "./httpClient";
import {
  BookingRecord,
  BookingStatus,
  CreateBookingPayload,
} from "../types/booking";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type RequestOptions = {
  body?: BodyInit | JsonValue;
  method?: "GET" | "POST" | "PATCH";
  token: string;
};

type BookingEnvelope = {
  booking: BookingRecord;
};

type BookingListEnvelope = {
  bookings: BookingRecord[];
};

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { body, method = "GET", token } = options;
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
  const data = text ? (JSON.parse(text) as T & { message?: string }) : null;

  if (!response.ok) {
    throw new Error(
      data && typeof data === "object" && "message" in data && data.message
        ? String(data.message)
        : `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export async function fetchMyBookings(token: string) {
  return request<BookingListEnvelope>("/bookings", {
    method: "GET",
    token,
  });
}

export async function createBooking(
  token: string,
  payload: CreateBookingPayload,
) {
  return request<BookingEnvelope>("/bookings", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateBookingStatus(
  token: string,
  bookingId: string,
  status: Extract<BookingStatus, "Confirmed" | "Cancelled">,
) {
  return request<BookingEnvelope>(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export async function sendBookingMessage(
  token: string,
  bookingId: string,
  body: string,
) {
  return request<BookingEnvelope>(`/bookings/${bookingId}/messages`, {
    method: "POST",
    token,
    body: { body },
  });
}
