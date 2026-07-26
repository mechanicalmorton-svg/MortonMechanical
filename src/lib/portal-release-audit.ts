import { isMissingAuditLogsTable, writeAuditEvent } from "./audit-log";
import { isDatabaseConfigured, requireAdminClient } from "./supabase/db";

/** Stable id so this Founder-facing release note is posted once. */
export const PORTAL_RELEASE_AUDIT_ID = "release-2026-07-26-portal-update";

const RELEASE_CHANGES = {
  title: "Portal update — Jul 26, 2026",
  commit: "42327a2",
  summary:
    "Major staff portal update: booking workflow, customer vehicle hub, roles/permissions customization, and break-glass Founder access.",
  sections: [
    {
      heading: "Bookings workflow",
      items: [
        "Confirm booking → creates linked work order + route stop",
        "Shop services catalog (manage services in Bookings)",
        "Booking location helpers: pin address + my location",
        "Booking media: gate code, access notes, photo uploads",
      ],
    },
    {
      heading: "Customer vehicles",
      items: [
        "Vehicle glovebox documents (uploads per customer vehicle)",
        "Maintenance / service history timeline",
        "VIN + license plate helpers and validation",
        "Customer vehicle detail hub (Vehicle file) from Bookings & Work Orders",
      ],
    },
    {
      heading: "Roles & User Management",
      items: [
        "Independent settings permissions (no dependency warnings)",
        "Drag-to-reorder role cards; order saved",
        "Pencil opens full role access editor popup",
        "Role badges: color picker + text / border / glow / hover customization",
        "Edit User role chips match Access Control order",
        "Portal users list sorted by role order",
        "Platform Architect acts as secret Founder (full access)",
        "Break-glass full access for adean@ and kstroud@ even without Founder roles",
      ],
    },
    {
      heading: "Other",
      items: [
        "Fleet / Work Order vehicle year + make/model field polish",
        "SQL migrations added for services, booking media/location, glovebox, and service history",
      ],
    },
  ],
} as const;

function formatReleaseNotes(): string {
  const lines: string[] = [
    RELEASE_CHANGES.title,
    "",
    RELEASE_CHANGES.summary,
    "",
    `Git commit: ${RELEASE_CHANGES.commit}`,
    "",
  ];
  for (const section of RELEASE_CHANGES.sections) {
    lines.push(`${section.heading}:`);
    for (const item of section.items) lines.push(`• ${item}`);
    lines.push("");
  }
  lines.push("Open this audit event’s details to review the full checklist.");
  return lines.join("\n").trim();
}

/**
 * Posts a one-time Founder-facing changelog into audit_logs the first time
 * Audit Logs are loaded after this deploy. Safe to call repeatedly.
 */
export async function ensurePortalReleaseAuditPosted(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const client = requireAdminClient();
    const { data, error } = await client
      .from("audit_logs")
      .select("id")
      .eq("record_id", PORTAL_RELEASE_AUDIT_ID)
      .limit(1);

    if (error) {
      if (isMissingAuditLogsTable(error.message)) return false;
      console.warn("[audit] could not check release note", error.message);
      return false;
    }
    if (data?.length) return false;

    const notes = formatReleaseNotes();
    const id = await writeAuditEvent({
      module: "system",
      action: "release_notes",
      description: RELEASE_CHANGES.summary,
      severity: "notice",
      status: "success",
      page: "/admin#audit-logs",
      recordType: "settings",
      recordId: PORTAL_RELEASE_AUDIT_ID,
      recordLabel: RELEASE_CHANGES.title,
      actorKind: "system",
      actorName: "Portal Update",
      actorEmail: "system@mortonsmechanical.com",
      actorRole: "Founder",
      notes,
      newValue: RELEASE_CHANGES,
      metadata: {
        kind: "portal_release_notes",
        commit: RELEASE_CHANGES.commit,
        forFounderReview: true,
      },
    });
    return Boolean(id);
  } catch (err) {
    console.warn("[audit] release note post failed", err);
    return false;
  }
}
