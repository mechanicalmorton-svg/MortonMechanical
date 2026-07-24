import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getContent, saveContent, validateContent } from "@/lib/content";
import { requireAuth, requireOwnerOrAdmin } from "@/lib/admin-api";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json(await getContent());
}

export async function PUT(req: Request) {
  const { error } = await requireOwnerOrAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const content = validateContent(body);
    await saveContent(content);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save content." },
      { status: 400 },
    );
  }
}
