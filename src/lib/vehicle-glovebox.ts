import { readJson, writeJson, newId } from "@/lib/store";
import { getCustomerVehicleById } from "@/lib/shop-data";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "@/lib/supabase/db";
import type { VehicleGloveboxDoc, VehicleGloveboxKind } from "@/lib/shop-types";

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

const BUCKET = "vehicle-glovebox";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_BYTES = 8 * 1024 * 1024;

function extension(contentType: string, fileName?: string) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (fileName?.includes(".")) return fileName.split(".").pop()!.toLowerCase();
  return "jpg";
}

function parseKind(value: unknown): VehicleGloveboxKind {
  if (value === "registration" || value === "insurance" || value === "inspection" || value === "other") {
    return value;
  }
  return "other";
}

function rowToDoc(r: Record<string, unknown>): VehicleGloveboxDoc {
  return {
    id: r.id as string,
    customerVehicleId: r.customer_vehicle_id as string,
    kind: parseKind(r.kind),
    label: (r.label as string) || "",
    fileUrl: r.file_url as string,
    fileName: (r.file_name as string) || "",
    contentType: (r.content_type as string) || "",
    expiresOn: (r.expires_on as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function docToRow(doc: VehicleGloveboxDoc) {
  return {
    id: doc.id,
    customer_vehicle_id: doc.customerVehicleId,
    kind: doc.kind,
    label: doc.label,
    file_url: doc.fileUrl,
    file_name: doc.fileName,
    content_type: doc.contentType,
    expires_on: doc.expiresOn || null,
    created_at: doc.createdAt,
  };
}

function missingTableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("customer_vehicle_documents") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("could not find"))
  );
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] || "");
}

export async function loadVehicleGlovebox(customerVehicleId: string): Promise<VehicleGloveboxDoc[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("customer_vehicle_documents")
      .select("*")
      .eq("customer_vehicle_id", customerVehicleId)
      .order("created_at", { ascending: false });
    if (error) {
      if (missingTableError(error.message)) {
        throw new Error(
          "Vehicle glovebox is not ready. Run supabase/add-vehicle-glovebox.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(error, "Could not load glovebox");
    }
    return (data ?? []).map((row) => rowToDoc(row as Record<string, unknown>));
  }

  return readJson<VehicleGloveboxDoc[]>("vehicle-glovebox.json", []).filter(
    (doc) => doc.customerVehicleId === customerVehicleId,
  );
}

export async function uploadVehicleGloveboxDoc(input: {
  customerVehicleId: string;
  kind?: unknown;
  label?: string;
  expiresOn?: string;
  file: File | Blob;
  contentType: string;
  fileName?: string;
}) {
  const vehicle = await getCustomerVehicleById(input.customerVehicleId);
  if (!vehicle) throw new Error("Customer vehicle not found.");

  if (!ALLOWED_TYPES.has(input.contentType)) {
    throw new Error("Use a JPG, PNG, WebP, GIF, or PDF file.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("File must be 8 MB or smaller.");
  }

  const kind = parseKind(input.kind);
  const fileName = input.fileName?.trim() || `document.${extension(input.contentType)}`;
  const label =
    input.label?.trim() ||
    (kind === "other" ? fileName : kind.charAt(0).toUpperCase() + kind.slice(1));

  let fileUrl = "";
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("Database is not configured.");
    const path = `${input.customerVehicleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension(
      input.contentType,
      fileName,
    )}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
      upsert: false,
      contentType: input.contentType,
      cacheControl: "3600",
    });
    if (uploadError) {
      const lower = uploadError.message.toLowerCase();
      if (lower.includes("bucket") || lower.includes("not found")) {
        throw new Error("Vehicle glovebox storage is not ready. Run supabase/add-vehicle-glovebox.sql.");
      }
      throw new Error(uploadError.message);
    }
    fileUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } else {
    // Local JSON mode: store a data URL so the UI can still preview small files.
    fileUrl = `data:${input.contentType};base64,${buffer.toString("base64")}`;
  }

  const doc: VehicleGloveboxDoc = {
    id: newId(),
    customerVehicleId: input.customerVehicleId,
    kind,
    label,
    fileUrl,
    fileName,
    contentType: input.contentType,
    expiresOn: input.expiresOn?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customer_vehicle_documents").upsert(docToRow(doc));
    if (error) {
      if (missingTableError(error.message)) {
        throw new Error(
          "Vehicle glovebox is not ready. Run supabase/add-vehicle-glovebox.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(error, "Could not save glovebox document");
    }
  } else {
    const items = readJson<VehicleGloveboxDoc[]>("vehicle-glovebox.json", []);
    items.unshift(doc);
    writeJson("vehicle-glovebox.json", items);
  }

  return doc;
}

export async function deleteVehicleGloveboxDoc(id: string) {
  let existing: VehicleGloveboxDoc | null = null;

  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("customer_vehicle_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwOnError(error, "Could not load glovebox document");
    existing = data ? rowToDoc(data as Record<string, unknown>) : null;
    if (!existing) throw new Error("Document not found.");

    const { error: deleteError } = await requireAdminClient()
      .from("customer_vehicle_documents")
      .delete()
      .eq("id", id);
    throwOnError(deleteError, "Could not delete glovebox document");
  } else {
    const items = readJson<VehicleGloveboxDoc[]>("vehicle-glovebox.json", []);
    existing = items.find((doc) => doc.id === id) ?? null;
    if (!existing) throw new Error("Document not found.");
    writeJson(
      "vehicle-glovebox.json",
      items.filter((doc) => doc.id !== id),
    );
  }

  if (isSupabaseConfigured() && existing.fileUrl && !existing.fileUrl.startsWith("data:")) {
    const admin = getSupabaseAdmin();
    const path = storagePathFromPublicUrl(existing.fileUrl);
    if (admin && path) {
      await admin.storage.from(BUCKET).remove([path]);
    }
  }

  return { ok: true as const };
}
