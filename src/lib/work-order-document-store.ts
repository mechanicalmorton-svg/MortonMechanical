import type { WorkOrderDocumentData } from "./shop-types";
import { requireAdminClient } from "./supabase/db";

const BUCKET = "work-order-documents";

function isMissingDocumentDataColumn(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("document_data") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("column"))
  );
}

async function ensureBucket() {
  const client = requireAdminClient();
  const { data, error } = await client.storage.listBuckets();
  if (error) throw error;
  if (!data?.some((bucket) => bucket.name === BUCKET)) {
    const created = await client.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 2 * 1024 * 1024,
    });
    if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
      throw created.error;
    }
  }
}

export async function saveWorkOrderDocumentData(id: string, documentData: WorkOrderDocumentData) {
  await ensureBucket();
  const client = requireAdminClient();
  const payload = JSON.stringify(documentData ?? {});
  const { error } = await client.storage.from(BUCKET).upload(`${id}.json`, payload, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}

export async function loadWorkOrderDocumentData(id: string): Promise<WorkOrderDocumentData | undefined> {
  try {
    await ensureBucket();
  } catch {
    return undefined;
  }

  const client = requireAdminClient();
  const { data, error } = await client.storage.from(BUCKET).download(`${id}.json`);
  if (error || !data) return undefined;

  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as WorkOrderDocumentData;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function findWorkOrderDocumentByToken(
  token: string,
): Promise<{ orderId: string; documentData: WorkOrderDocumentData } | null> {
  if (!token) return null;

  try {
    await ensureBucket();
  } catch {
    return null;
  }

  const client = requireAdminClient();
  const { data: files, error } = await client.storage.from(BUCKET).list("", {
    limit: 200,
    sortBy: { column: "updated_at", order: "desc" },
  });
  if (error || !files?.length) return null;

  for (const file of files) {
    if (!file.name.endsWith(".json")) continue;
    const orderId = file.name.replace(/\.json$/i, "");
    const documentData = await loadWorkOrderDocumentData(orderId);
    if (documentData?.viewToken === token) {
      return { orderId, documentData };
    }
  }

  return null;
}

export { isMissingDocumentDataColumn };
