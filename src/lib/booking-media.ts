import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadBookings, upsertBooking } from "@/lib/shop-data";
import type { Booking } from "@/lib/shop-types";

const BUCKET = "booking-media";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] || "");
}

export async function uploadBookingPhoto(bookingId: string, file: File | Blob, contentType: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Photo uploads require Supabase storage.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const booking = (await loadBookings()).find((item) => item.id === bookingId);
  if (!booking) throw new Error("Booking not found.");

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database is not configured.");

  const path = `${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension(contentType)}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    upsert: false,
    contentType,
    cacheControl: "3600",
  });
  if (uploadError) {
    const lower = uploadError.message.toLowerCase();
    if (lower.includes("bucket") || lower.includes("not found")) {
      throw new Error("Booking media storage is not ready. Run supabase/add-booking-media-location.sql.");
    }
    throw new Error(uploadError.message);
  }

  const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(path);
  const photoUrl = publicUrl.publicUrl;
  const next: Booking = {
    ...booking,
    photoUrls: [...(booking.photoUrls ?? []), photoUrl],
  };
  await upsertBooking(next);
  return { photoUrl, booking: next };
}

export async function removeBookingPhoto(bookingId: string, photoUrl: string) {
  const booking = (await loadBookings()).find((item) => item.id === bookingId);
  if (!booking) throw new Error("Booking not found.");

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseConfigured()) {
    const path = storagePathFromPublicUrl(photoUrl);
    if (path) {
      await admin.storage.from(BUCKET).remove([path]);
    }
  }

  const next: Booking = {
    ...booking,
    photoUrls: (booking.photoUrls ?? []).filter((url) => url !== photoUrl),
  };
  await upsertBooking(next);
  return next;
}
