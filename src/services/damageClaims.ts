import { API_BASE_URL } from "../config/api";
import { UploadAsset } from "./auth";
import {
  DamageClaimRecord,
  DamageClaimStatus,
  SubmitDamageClaimPayload,
} from "../types/damageClaim";

type DamageClaimEnvelope = {
  claim: DamageClaimRecord;
  message?: string;
};

type DamageClaimListEnvelope = {
  claims: DamageClaimRecord[];
  message?: string;
};

type RequestMethod = "GET" | "PATCH";

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

function uploadFormData<T>(
  path: string,
  token: string,
  formData: FormData,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.responseType = "text";
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = () => {
      const responseText = xhr.responseText || "";
      const data = responseText
        ? (JSON.parse(responseText) as T & { message?: string })
        : null;

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
        return;
      }

      reject(
        new Error(
          data && typeof data === "object" && "message" in data && data.message
            ? String(data.message)
            : `Request failed with status ${xhr.status}`,
        ),
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`,
        ),
      );
    };

    xhr.send(formData);
  });
}

function appendPhotos(formData: FormData, assets: UploadAsset[]) {
  assets.forEach((asset, index) => {
    formData.append("photos", {
      uri: asset.uri,
      name: asset.name || `damage-photo-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || "image/jpeg",
    } as any);
  });
}

export async function fetchDamageClaims(token: string) {
  return request<DamageClaimListEnvelope>("/damage-claims", token, "GET");
}

export async function submitDamageClaim(
  token: string,
  payload: SubmitDamageClaimPayload,
  photos: UploadAsset[],
) {
  const formData = new FormData();
  formData.append("bookingId", payload.bookingId);
  formData.append("description", payload.description);
  formData.append("claimedAmount", String(payload.claimedAmount));
  appendPhotos(formData, photos);

  return uploadFormData<DamageClaimEnvelope>("/damage-claims", token, formData);
}

export async function disputeDamageClaim(
  token: string,
  claimId: string,
  disputeReason: string,
) {
  return request<DamageClaimEnvelope>(
    `/damage-claims/${claimId}/dispute`,
    token,
    "PATCH",
    { disputeReason },
  );
}

export async function reviewDamageClaim(
  token: string,
  claimId: string,
  status: Extract<DamageClaimStatus, "Approved" | "Rejected">,
  adminReviewNote = "",
) {
  return request<DamageClaimEnvelope>(
    `/damage-claims/${claimId}/review`,
    token,
    "PATCH",
    { status, adminReviewNote },
  );
}

export async function triggerDamageClaimCharge(
  token: string,
  claimId: string,
  chargeNote = "",
) {
  return request<DamageClaimEnvelope>(
    `/damage-claims/${claimId}/charge`,
    token,
    "PATCH",
    { chargeNote },
  );
}
