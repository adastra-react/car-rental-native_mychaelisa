import { API_BASE_URL } from "../config/api";
import { ReviewRecord, SubmitReviewPayload } from "../types/review";

type ReviewEnvelope = {
  review: ReviewRecord;
  message?: string;
};

type ReviewListEnvelope = {
  reviews: ReviewRecord[];
  message?: string;
};

type RequestMethod = "GET" | "POST";

async function request<TResponse>(
  path: string,
  method: RequestMethod,
  token?: string,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`,
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

export async function submitReview(
  token: string,
  bookingId: string,
  payload: SubmitReviewPayload,
) {
  return request<ReviewEnvelope>(
    `/bookings/${bookingId}/review`,
    "POST",
    token,
    payload,
  );
}

export async function fetchVehicleReviews(vehicleId: string) {
  return request<ReviewListEnvelope>(`/vehicles/${vehicleId}/reviews`, "GET");
}
