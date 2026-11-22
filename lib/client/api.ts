// Browser helper for calling Visper's API with the signed-in user's token and
// turning failures into readable error messages.
import type { User } from "firebase/auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function authHeaders(user: User | null, init: RequestInit) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!user) throw new ApiError("Please sign in again", 401);
  try {
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  } catch (error) {
    // Offline with an expired token: carry on without it so the service
    // worker can still answer from its cache.
    if (typeof navigator !== "undefined" && navigator.onLine) throw error;
  }
  return headers;
}

async function send(user: User | null, path: string, init: RequestInit = {}) {
  const headers = await authHeaders(user, init);
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(
      typeof navigator !== "undefined" && !navigator.onLine
        ? "You're offline right now"
        : "Couldn't reach Visper. Check your connection and try again.",
      0
    );
  }
  if (!response.ok) {
    let message = "";
    try {
      const data = await response.json();
      message = data.error || data.message || "";
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(message || `Something went wrong (${response.status})`, response.status);
  }
  return response;
}

/** JSON request. Throws ApiError with the server's message on failure. */
export async function apiFetch<T = any>(
  user: User | null,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await send(user, path, init);
  return response.json() as Promise<T>;
}

/** Downloads a file response and saves it with the given name. */
export async function apiDownload(user: User | null, path: string, filename: string) {
  const response = await send(user, path);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Light haptic tick on supporting phones (Android). */
export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported
  }
}
