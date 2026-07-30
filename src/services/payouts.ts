import { API_BASE_URL } from "../config/api";
import { PayoutBalance, PayoutRequestRecord } from "../types/payout";

type PayoutListEnvelope = PayoutBalance & {
  payouts: PayoutRequestRecord[];
  message?: string;
};

type PayoutEnvelope = {
  payout: PayoutRequestRecord;
  message?: string;
};

type RequestMethod = "GET" | "POST";

async function request<TResponse>(
  path: string,
  token: string,
  method: RequestMethod,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
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

export async function fetchMyPayouts(token: string) {
  return request<PayoutListEnvelope>("/payouts", token, "GET");
}

export async function requestPayout(token: string, amount: number) {
  return request<PayoutEnvelope>("/payouts", token, "POST", { amount });
}
