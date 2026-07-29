import { API_BASE_URL } from "../config/api";
import { PickupPoint } from "../data/pickupPoints";

type PickupPointListEnvelope = {
  pickupPoints: PickupPoint[];
  message?: string;
};

export async function fetchPickupPoints() {
  const response = await fetch(`${API_BASE_URL}/pickup-points`, {
    headers: { Accept: "application/json" },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as PickupPointListEnvelope) : null;

  if (!response.ok || !data) {
    throw new Error(
      data?.message ? data.message : `Request failed with status ${response.status}`,
    );
  }

  return data.pickupPoints;
}
