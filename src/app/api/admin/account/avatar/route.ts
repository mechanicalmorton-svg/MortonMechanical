import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { removeAccountAvatar, uploadAccountAvatar } from "@/lib/account-profile";

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
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not upload photo." }, { status: 400 });
  }
}

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    await removeAccountAvatar(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not remove photo." }, { status: 400 });
  }
}
