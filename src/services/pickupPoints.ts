import { API_BASE_URL } from "../config/api";
import { fetchWithTimeout } from "./httpClient";
import { PickupPoint } from "../data/pickupPoints";

type PickupPointListEnvelope = {
  pickupPoints: PickupPoint[];
  message?: string;
};

export async function fetchPickupPoints() {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/pickup-points`, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new Error(
      `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`,
    );
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as PickupPointListEnvelope) : null;

  if (!response.ok || !data) {
    throw new Error(
      data?.message ? data.message : `Request failed with status ${response.status}`,
    );
  }

  return data.pickupPoints;
}
