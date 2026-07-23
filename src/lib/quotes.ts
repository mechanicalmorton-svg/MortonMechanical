import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase/server";
import { readJson, writeJson, newId } from "./store";

export type Quote = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rego?: string;
  service: string;
  contactMethod: string;
  message?: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

function rowToQuote(r: Record<string, unknown>): Quote {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    email: (r.email as string) || undefined,
    rego: (r.rego as string) || undefined,
    service: r.service as string,
    contactMethod: r.contact_method as string,
    message: (r.message as string) || undefined,
    status: r.status as Quote["status"],
    createdAt: r.created_at as string,
  };
}

function quoteToRow(q: Quote) {
  return {
    id: q.id,
    name: q.name,
    phone: q.phone,
    email: q.email ?? "",
    rego: q.rego ?? "",
    service: q.service,
    contact_method: q.contactMethod,
    message: q.message ?? "",
    status: q.status,
    created_at: q.createdAt,
  };
}

export async function loadQuotes(): Promise<Quote[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("quotes").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(rowToQuote);
  }
  return readJson("quotes.json", []);
}

export async function addQuote(entry: Omit<Quote, "id" | "createdAt" | "status"> & { status?: Quote["status"] }) {
  const quote: Quote = {
    id: newId(),
    ...entry,
    status: entry.status ?? "new",
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("quotes").insert(quoteToRow(quote));
    return quote;
  }

  const quotes = readJson<Quote[]>("quotes.json", []);
  quotes.push(quote);
  writeJson("quotes.json", quotes);
  return quote;
}

export async function updateQuote(id: string, patch: Partial<Quote>) {
  if (isSupabaseConfigured()) {
    const row: Record<string, unknown> = {};
    if (patch.status) row.status = patch.status;
    await getSupabaseAdmin()!.from("quotes").update(row).eq("id", id);
    const quotes = await loadQuotes();
    return quotes.find((q) => q.id === id) ?? null;
  }

  const quotes = readJson<Quote[]>("quotes.json", []);
  const q = quotes.find((x) => x.id === id);
  if (!q) return null;
  Object.assign(q, patch);
  writeJson("quotes.json", quotes);
  return q;
}

export async function deleteQuote(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("quotes").delete().eq("id", id);
    return;
  }
  writeJson("quotes.json", readJson<Quote[]>("quotes.json", []).filter((q) => q.id !== id));
}

export { newId as createId };
