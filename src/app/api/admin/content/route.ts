import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { withAdminAuth, withOwnerAdmin } from "@/lib/admin-route";
import { getContent, saveContent, validateContent } from "@/lib/content";

export async function GET() {
  return withAdminAuth(async () => NextResponse.json(await getContent()));
}

export async function PUT(req: Request) {
  return withOwnerAdmin(async () => {
    const body = await req.json();
    const content = validateContent(body);
    await saveContent(content);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, content });
  });
}
