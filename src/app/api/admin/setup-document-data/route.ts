import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { requireAdminClient } from "@/lib/supabase/db";
import { isMissingDocumentDataColumn } from "@/lib/work-order-document-store";

/**
 * Ensures work_orders.document_data is usable.
 * If the column is missing from PostgREST, returns the SQL the owner must run.
 */
export async function POST() {
  return withPermission("work_orders.edit", async () => {
    const client = requireAdminClient();
    const probe = await client.from("work_orders").select("id, document_data").limit(1);

    if (!probe.error) {
      return NextResponse.json({
        ok: true,
        ready: true,
        message: "document_data column is available.",
      });
    }

    if (isMissingDocumentDataColumn(probe.error.message)) {
      return NextResponse.json(
        {
          ok: false,
          ready: false,
          message:
            "The document_data column is missing. Run this SQL in the Supabase SQL editor, then click Save again:",
          sql: "alter table work_orders add column if not exists document_data jsonb default '{}'::jsonb;",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { ok: false, ready: false, message: probe.error.message },
      { status: 500 },
    );
  });
}
