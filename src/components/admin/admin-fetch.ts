export async function adminGet<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return { data: null, error: data.error ?? "Could not load data." };
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
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: data.error ?? "Request failed." };
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: "Network error. Please try again." };
  }
}
