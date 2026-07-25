import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";
import { readJson, writeJson, newId } from "./store";
import { auditDelete, auditUpsert } from "./audit-instrument";

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

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

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
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    throwOnError(error, "Could not load quote requests");
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

  if (useDatabase()) {
    const { error } = await requireAdminClient().from("quotes").insert(quoteToRow(quote));
    throwOnError(error, "Could not save quote request");
  } else {
    const quotes = readJson<Quote[]>("quotes.json", []);
    quotes.push(quote);
    writeJson("quotes.json", quotes);
  }
  void auditUpsert({
    module: "quotes",
    recordType: "quote",
    recordId: quote.id,
    recordLabel: quote.name,
    before: null,
    after: quote,
    createDescription: `Quote request submitted by ${quote.name}`,
    updateDescription: `Quote request updated for ${quote.name}`,
    page: "/contact",
  });
  return quote;
}

export async function updateQuote(id: string, patch: Partial<Quote>) {
  const before = (await loadQuotes()).find((q) => q.id === id) ?? null;
  if (useDatabase()) {
    const row: Record<string, unknown> = {};
    if (patch.status) row.status = patch.status;
    if (Object.keys(row).length) {
      const { error } = await requireAdminClient().from("quotes").update(row).eq("id", id);
      throwOnError(error, "Could not update quote request");
    }
    const quotes = await loadQuotes();
    const next = quotes.find((q) => q.id === id) ?? null;
    if (next) {
      void auditUpsert({
        module: "quotes",
        recordType: "quote",
        recordId: id,
        recordLabel: next.name,
        before,
        after: next,
        createDescription: `Quote created for ${next.name}`,
        updateDescription: `Quote status updated for ${next.name}`,
        page: "/admin#quotes",
      });
    }
    return next;
  }

  const quotes = readJson<Quote[]>("quotes.json", []);
  const q = quotes.find((x) => x.id === id);
  if (!q) return null;
  Object.assign(q, patch);
  writeJson("quotes.json", quotes);
  void auditUpsert({
    module: "quotes",
    recordType: "quote",
    recordId: id,
    recordLabel: q.name,
    before,
    after: q,
    createDescription: `Quote created for ${q.name}`,
    updateDescription: `Quote updated for ${q.name}`,
    page: "/admin#quotes",
  });
  return q;
}

export async function deleteQuote(id: string) {
  const before = (await loadQuotes()).find((q) => q.id === id) ?? null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("quotes").delete().eq("id", id);
    throwOnError(error, "Could not delete quote request");
  } else {
    writeJson("quotes.json", readJson<Quote[]>("quotes.json", []).filter((q) => q.id !== id));
  }
  void auditDelete({
    module: "quotes",
    recordType: "quote",
    recordId: id,
    recordLabel: before?.name,
    before,
    description: `Quote deleted: ${before?.name || id}`,
    page: "/admin#quotes",
  });
}

export { newId as createId };
