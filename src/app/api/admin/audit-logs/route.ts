import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { isMissingAuditLogsTable, rowToAuditLog } from "@/lib/audit-log";
import { AUDIT_SQL } from "@/lib/audit-types";
import { ensurePortalReleaseAuditPosted } from "@/lib/portal-release-audit";
import { requireAdminClient } from "@/lib/supabase/db";

const MAX_PAGE = 100;
const MAX_EXPORT = 10_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function resolveDateRange(preset: string | null, from: string | null, to: string | null) {
  const now = new Date();
  if (from || to) {
    return {
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    };
  }
  switch (preset) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: undefined };
    case "yesterday": {
      const y = startOfDay(now);
      y.setDate(y.getDate() - 1);
      const end = startOfDay(now);
      return { from: y.toISOString(), to: end.toISOString() };
    }
    case "7d": {
      const s = startOfDay(now);
      s.setDate(s.getDate() - 7);
      return { from: s.toISOString(), to: undefined };
    }
    case "30d": {
      const s = startOfDay(now);
      s.setDate(s.getDate() - 30);
      return { from: s.toISOString(), to: undefined };
    }
    case "90d": {
      const s = startOfDay(now);
      s.setDate(s.getDate() - 90);
      return { from: s.toISOString(), to: undefined };
    }
    case "year": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { from: s.toISOString(), to: undefined };
    }
    default:
      return { from: undefined, to: undefined };
  }
}

function toCsv(rows: ReturnType<typeof rowToAuditLog>[]) {
  const headers = [
    "id",
    "createdAt",
    "actorName",
    "actorEmail",
    "actorRole",
    "actorKind",
    "module",
    "action",
    "description",
    "severity",
    "status",
    "recordType",
    "recordId",
    "recordLabel",
    "changedFields",
    "ipAddress",
    "browser",
    "os",
    "device",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.createdAt,
        row.actorName,
        row.actorEmail,
        row.actorRole,
        row.actorKind,
        row.module,
        row.action,
        row.description,
        row.severity,
        row.status,
        row.recordType,
        row.recordId,
        row.recordLabel,
        row.changedFields.join("|"),
        row.ipAddress,
        row.browser,
        row.os,
        row.device,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const exportFmt = url.searchParams.get("export");
  const requiredKey = exportFmt ? "audit_logs.export" : "audit_logs.view";

  return withPermission(requiredKey, async () => {
    // One-time Founder-facing release changelog for this portal update.
    await ensurePortalReleaseAuditPosted();

    const q = url.searchParams.get("q")?.trim() || "";
    const moduleFilter = url.searchParams.get("module")?.trim() || "";
    const action = url.searchParams.get("action")?.trim() || "";
    const severity = url.searchParams.get("severity")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const actor = url.searchParams.get("actor")?.trim() || "";
    const recordType = url.searchParams.get("recordType")?.trim() || "";
    const recordId = url.searchParams.get("recordId")?.trim() || "";
    const preset = url.searchParams.get("preset");
    const sort = url.searchParams.get("sort") || "newest";
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
    const limit = Math.min(MAX_PAGE, Math.max(1, Number(url.searchParams.get("limit") || 50) || 50));
    const { from, to } = resolveDateRange(preset, url.searchParams.get("from"), url.searchParams.get("to"));

    const client = requireAdminClient();
    let query = client.from("audit_logs").select("*", { count: "exact" });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);
    if (moduleFilter) query = query.eq("module", moduleFilter);
    if (action) query = query.eq("action", action);
    if (severity) query = query.eq("severity", severity);
    if (status) query = query.eq("status", status);
    if (recordType) query = query.eq("record_type", recordType);
    if (recordId) query = query.eq("record_id", recordId);
    if (actor) {
      query = query.or(`actor_name.ilike.%${actor}%,actor_email.ilike.%${actor}%,actor_user_id.eq.${actor}`);
    }
    if (q) {
      query = query.ilike("search_text", `%${q.toLowerCase()}%`);
    }

    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else if (sort === "employee") query = query.order("actor_name", { ascending: true }).order("created_at", { ascending: false });
    else if (sort === "severity") query = query.order("severity", { ascending: true }).order("created_at", { ascending: false });
    else if (sort === "module") query = query.order("module", { ascending: true }).order("created_at", { ascending: false });
    else if (sort === "action") query = query.order("action", { ascending: true }).order("created_at", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    const exportLimit = exportFmt ? MAX_EXPORT : limit;
    const exportOffset = exportFmt ? 0 : offset;
    query = query.range(exportOffset, exportOffset + exportLimit - 1);

    const { data, error, count } = await query;
    if (error) {
      if (isMissingAuditLogsTable(error.message)) {
        return NextResponse.json(
          {
            ready: false,
            error: "Audit logs table is missing. Run the SQL migration in Supabase.",
            sql: AUDIT_SQL,
            sqlFile: "supabase/add-audit-logs.sql",
            items: [],
            total: 0,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? []).map((row) => rowToAuditLog(row as Record<string, unknown>));

    if (exportFmt === "csv") {
      return new NextResponse(toCsv(items), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
          "X-Audit-Export-Truncated": String((count ?? 0) > MAX_EXPORT),
          "X-Audit-Export-Total": String(count ?? items.length),
        },
      });
    }

    if (exportFmt === "json") {
      return new NextResponse(
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            total: count ?? items.length,
            truncated: (count ?? 0) > MAX_EXPORT,
            items,
          },
          null,
          2,
        ),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        },
      );
    }

    return NextResponse.json({
      ready: true,
      items,
      total: count ?? items.length,
      offset: exportOffset,
      limit: exportLimit,
      hasMore: exportOffset + items.length < (count ?? 0),
    });
  });
}
