import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { removeAccountAvatar, uploadAccountAvatar } from "@/lib/account-profile";
import { sanitizeAuthError } from "@/lib/auth-errors";

function errorJson(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: sanitizeAuthError(message, fallback) }, { status: 400 });
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const avatarUrl = await uploadAccountAvatar(user.id, file, file.type || "image/jpeg");
    return NextResponse.json({ avatarUrl });
  } catch (err) {
    return errorJson(err, "Could not upload photo.");
  }
}

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    await removeAccountAvatar(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err, "Could not remove photo.");
  }
}
