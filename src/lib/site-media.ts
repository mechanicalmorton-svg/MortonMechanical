import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

const BUCKET = "site-media";
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
]);

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");
const LOCAL_PREFIX = "/uploads/";

function safeSlot(slot: string) {
  const cleaned = slot.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return cleaned || "image";
}

function fileName(slot: string, ext: string) {
  return `${safeSlot(slot)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] || "");
}

/** Creates the public bucket on first upload so no manual SQL step is needed. */
async function ensureBucket(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data } = await admin.storage.getBucket(BUCKET);
  if (data) return;
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES.keys()],
  });
}

export async function uploadSiteImage(slot: string, file: File | Blob, contentType: string) {
  const ext = ALLOWED_TYPES.get(contentType);
  if (!ext) throw new Error("Use a JPG, PNG, WebP, GIF, or ICO image.");

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) throw new Error("Image must be 5 MB or smaller.");

  const name = fileName(slot, ext);

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("Database is not configured.");

    await ensureBucket(admin);
    const objectPath = `${safeSlot(slot)}/${name}`;
    const { error } = await admin.storage.from(BUCKET).upload(objectPath, buffer, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });
    if (error) throw new Error(error.message);

    const { data } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  // Local development without Supabase: keep the file under public/ so it serves normally.
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, name), buffer);
  return `${LOCAL_PREFIX}${name}`;
}

/** Deletes an uploaded file. Ignores defaults and external URLs, which are not ours to delete. */
export async function removeSiteImage(url: string) {
  const target = url.trim();
  if (!target) return;

  if (target.startsWith(LOCAL_PREFIX)) {
    const name = path.basename(target);
    try {
      fs.unlinkSync(path.join(LOCAL_DIR, name));
    } catch {
      /* already gone */
    }
    return;
  }

  const objectPath = storagePathFromPublicUrl(target);
  if (!objectPath) return;

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseConfigured()) {
    await admin.storage.from(BUCKET).remove([objectPath]);
  }
}
