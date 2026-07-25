import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { withAdminAuth, withOwnerAdmin } from "@/lib/admin-route";
import { getContent, saveContent, validateContent } from "@/lib/content";

function revalidatePublicSite() {
  // Clear cached public pages so visitors see Site Contents changes immediately.
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/privacy");
  revalidatePath("/terms");
}

export async function GET() {
  return withAdminAuth(async () => NextResponse.json(await getContent()));
}

export async function PUT(req: Request) {
  return withOwnerAdmin(async () => {
    try {
      const before = await getContent();
      const body = await req.json();
      const content = validateContent(body);
      await saveContent(content);
      revalidatePublicSite();
      const { writeAuditEvent } = await import("@/lib/audit-log");
      void writeAuditEvent({
        module: "content",
        action: "settings_updated",
        description: "Site contents updated",
        recordType: "content",
        recordId: "site_content",
        recordLabel: content.site.name,
        oldValue: before,
        newValue: content,
        page: "/admin#site-contents",
      });
      return NextResponse.json({
        ok: true,
        content,
        message: "Saved. Your website homepage and contact page are updated.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save site contents.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
