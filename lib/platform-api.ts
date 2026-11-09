const API_URL = "/api/backend";

type ApiError = { message?: string };

export async function platformRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const data = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(data.message ?? `Request failed (${response.status}).`);
  }
  return data;
}

export function getApiUrl() {
  return API_URL;
}
