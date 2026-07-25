/** Normalize `/api/admin/staff` which may return an array or `{ staff: [...] }`. */
export function asStaffList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { staff?: unknown }).staff)) {
    return (data as { staff: T[] }).staff;
  }
  return [];
}

function normalizeAdminError(status: number, payload: { error?: string } | null) {
  const raw = payload?.error?.trim() || "";
  const lower = raw.toLowerCase();
  if (
    status === 401 ||
    lower.includes("not signed in") ||
    lower === "unauthorized" ||
    lower.includes("jwt") ||
    lower.includes("session")
  ) {
    // Avoid scaring a still-open dashboard with a fake "log in" alarm while auth recovers.
    return "Could not verify your session for that request. Refresh the page if this keeps happening.";
  }
  return raw || (status >= 500 ? "Server error. Please try again." : "Request failed.");
}

export async function adminGet<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: normalizeAdminError(res.status, data) };
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: "Network error. Please try again." };
  }
}

export async function adminSend<T>(
  url: string,
  init: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, { credentials: "same-origin", ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: normalizeAdminError(res.status, data) };
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: "Network error. Please try again." };
  }
}
