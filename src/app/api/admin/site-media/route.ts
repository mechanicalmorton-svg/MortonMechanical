import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { removeSiteImage, uploadSiteImage } from "@/lib/site-media";

function errorJson(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  return withPermission("content.edit", async () => {
    try {
      const form = await req.formData();
      const slot = String(form.get("slot") ?? "image").trim();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
      }

      const url = await uploadSiteImage(slot, file, file.type || "image/png");
      return NextResponse.json({ url });
    } catch (error) {
      return errorJson(error, "Could not upload image.");
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("content.edit", async () => {
    try {
      const body = await req.json();
      const url = String(body.url ?? "").trim();
      if (!url) return NextResponse.json({ error: "url is required." }, { status: 400 });

      await removeSiteImage(url);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return errorJson(error, "Could not remove image.");
    }
  });
}
