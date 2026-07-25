import { API_BASE_URL } from "../config/api";
import { AuthResponse, AuthUser } from "../types/auth";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type RequestOptions = {
  body?: BodyInit | JsonValue;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string;
  isFormData?: boolean;
};

export type UploadAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type UserEnvelope = {
  user: AuthUser;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, isFormData = false, method = "GET", token } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("network request failed") ||
        message.includes("load failed") ||
        message.includes("failed to fetch")
      ) {
        throw new Error(
          `Could not connect to the server at ${API_BASE_URL}. Make sure car-rental-server is running.`,
        );
      }
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "The file could not be prepared for upload. Please try a different file.",
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

export function getBackendUrlLabel() {
  return API_BASE_URL;
}

export async function loginUser(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function registerUser(payload: {
  email: string;
  password: string;
  role: "Owner" | "Renter";
  name?: string;
}) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export async function fetchCurrentUser(token: string) {
  return request<UserEnvelope>("/auth/me", {
    method: "GET",
    token,
  });
}

export async function saveProfile(
  token: string,
  updates: Pick<AuthUser, "name" | "phone" | "bio">,
) {
  return request<UserEnvelope>("/auth/me", {
    method: "PUT",
    token,
    body: updates,
  });
}

async function appendFile(
  formData: FormData,
  fieldName: string,
  asset: UploadAsset,
) {
  if (!asset.uri) {
    throw new Error("The selected file could not be read for upload.");
  }

  const fallbackName = `${fieldName}-${Date.now()}`;
  formData.append(fieldName, {
    uri: asset.uri,
    name: asset.name?.trim() || fallbackName,
    type: asset.mimeType || "application/octet-stream",
  } as any);
}

async function uploadFormData<T>(
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

export async function uploadLicense(token: string, asset: UploadAsset) {
  const formData = new FormData();
  await appendFile(formData, "license", asset);
  return uploadFormData<UserEnvelope>("/auth/upload-license", token, formData);
}

export async function uploadSupportingDocument(
  token: string,
  asset: UploadAsset,
  label: string,
) {
  const formData = new FormData();
  await appendFile(formData, "document", asset);
  formData.append("label", label);
  return uploadFormData<UserEnvelope>("/auth/upload-document", token, formData);
}

export async function deleteSupportingDocument(
  token: string,
  documentId: string,
) {
  return request<UserEnvelope>(`/auth/documents/${documentId}`, {
    method: "DELETE",
    token,
  });
}
