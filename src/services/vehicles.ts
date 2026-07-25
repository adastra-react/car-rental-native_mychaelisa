import { API_BASE_URL } from "../config/api";
import { UploadAsset } from "./auth";
import { VehicleListing, VehicleListingPayload } from "../types/vehicle";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type RequestOptions = {
  body?: BodyInit | JsonValue;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token: string;
  isFormData?: boolean;
};

type VehicleEnvelope = {
  vehicle: VehicleListing;
};

type VehicleListEnvelope = {
  vehicles: VehicleListing[];
};

async function requestPublic<T>(
  path: string,
  method: RequestOptions["method"] = "GET",
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
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

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { body, isFormData = false, method = "GET", token } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: isFormData
        ? headers
        : {
            ...headers,
            "Content-Type": "application/json",
          },
      body:
        body == null
          ? undefined
          : isFormData
            ? (body as BodyInit)
            : JSON.stringify(body),
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

function appendUploadFiles(formData: FormData, assets: UploadAsset[]) {
  assets.forEach((asset) => {
    formData.append("photos", {
      uri: asset.uri,
      name: asset.name || `photo-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    } as any);
  });
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

export async function fetchMyListings(token: string) {
  return request<VehicleListEnvelope>("/vehicles/mine", {
    method: "GET",
    token,
  });
}

export async function fetchPublicListings() {
  return requestPublic<VehicleListEnvelope>("/vehicles");
}

export async function createVehicleListing(
  token: string,
  payload: VehicleListingPayload,
) {
  return request<VehicleEnvelope>("/vehicles", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateVehicleListing(
  token: string,
  vehicleId: string,
  payload: VehicleListingPayload,
) {
  return request<VehicleEnvelope>(`/vehicles/${vehicleId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function updateVehicleListingStatus(
  token: string,
  vehicleId: string,
  status: VehicleListing["status"],
) {
  return request<VehicleEnvelope>(`/vehicles/${vehicleId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export async function updateVehicleAvailability(
  token: string,
  vehicleId: string,
  blockedDates: string[],
) {
  return request<VehicleEnvelope>(`/vehicles/${vehicleId}/availability`, {
    method: "PATCH",
    token,
    body: { blockedDates },
  });
}

export async function uploadVehiclePhotos(
  token: string,
  vehicleId: string,
  assets: UploadAsset[],
) {
  const formData = new FormData();
  appendUploadFiles(formData, assets);
  return uploadFormData<VehicleEnvelope>(
    `/vehicles/${vehicleId}/photos`,
    token,
    formData,
  );
}

export async function deleteVehiclePhoto(
  token: string,
  vehicleId: string,
  photoId: string,
) {
  return request<VehicleEnvelope>(`/vehicles/${vehicleId}/photos/${photoId}`, {
    method: "DELETE",
    token,
  });
}
