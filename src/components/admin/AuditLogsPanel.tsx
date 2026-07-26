"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ChevronDown,
  ClipboardCopy,
  Download,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  ScrollText,
  Search,
  X,
} from "lucide-react";
import type { AuditLogEntry } from "@/lib/audit-types";
import { AUDIT_MODULE_OPTIONS, AUDIT_SEVERITY_OPTIONS } from "@/lib/audit-types";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

type ListResponse = {
  ready?: boolean;
  items?: AuditLogEntry[];
  total?: number;
  hasMore?: boolean;
  error?: string;
  sqlFile?: string;
};

const PRESETS = [
  { id: "", label: "All time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "year", label: "This year" },
];

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "employee", label: "Employee" },
  { id: "module", label: "Module" },
  { id: "action", label: "Action" },
  { id: "severity", label: "Severity" },
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <pre className="max-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogsPanel() {
  const toast = useAdminToast();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingSql, setMissingSql] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [preset, setPreset] = useState("30d");
  const [moduleFilter, setModuleFilter] = useState("");
  const [severity, setSeverity] = useState("");
  const [actor, setActor] = useState("");
  const [recordType, setRecordType] = useState("");
  const [sort, setSort] = useState("newest");

  function buildQuery(offset = 0) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (preset) params.set("preset", preset);
    if (moduleFilter) params.set("module", moduleFilter);
    if (severity) params.set("severity", severity);
    if (actor.trim()) params.set("actor", actor.trim());
    if (recordType.trim()) params.set("recordType", recordType.trim());
    params.set("sort", sort);
    params.set("offset", String(offset));
    params.set("limit", "50");
    return params.toString();
  }

  async function load(reset = true) {
    setLoading(true);
    const offset = reset ? 0 : items.length;
    try {
      const res = await fetch(`/api/admin/audit-logs?${buildQuery(offset)}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as ListResponse;
      setLoading(false);
      if (res.status === 409 || data.ready === false) {
        setMissingSql(data.sqlFile || "supabase/add-audit-logs.sql");
        setItems([]);
        setTotal(0);
        setHasMore(false);
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Could not load audit logs.");
        return;
      }
      setMissingSql(null);
      const next = data.items ?? [];
      setItems(reset ? next : [...items, ...next]);
      setTotal(data.total ?? next.length);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setLoading(false);
      toast.error("Network error. Please try again.");
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, moduleFilter, severity, sort]);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  }

  function exportUrl(fmt: "csv" | "json") {
    return `/api/admin/audit-logs?${buildQuery(0)}&export=${fmt}`;
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Audit Logs"
          subtitle="Immutable history of who changed what, when, and the before/after values."
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Can permission="audit_logs.export">
            <a href={exportUrl("csv")} className={btnSecondary}>
              <Download className="h-4 w-4" /> CSV / Excel
            </a>
            <a href={exportUrl("json")} className={btnSecondary}>
              <Download className="h-4 w-4" /> JSON
            </a>
          </Can>
          <button type="button" className={btnSecondary} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {missingSql ? (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-semibold">Audit log table is not installed yet.</p>
          <p className="mt-1 text-amber-100/80">
            Run <code className="text-amber-50">{missingSql}</code> in the Supabase SQL editor, then refresh.
          </p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-amber-500/20 bg-slate-950/50 p-3 text-[11px] text-amber-50/90">
{`See file contents — open ${missingSql} and execute the full script.`}
          </pre>
        </div>
      ) : null}

      <div className="sticky top-0 z-20 mb-4 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-xl shadow-black/20 backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className={`${inputClass} pl-10`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, VIN, IP, record id, keyword…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") load(true);
                }}
              />
            </div>
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Date range</span>
            <select className={inputClass} value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((p) => (
                <option key={p.id || "all"} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Module</span>
            <select className={inputClass} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="">All modules</option>
              {AUDIT_MODULE_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Severity</span>
            <select className={inputClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All</option>
              {AUDIT_SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Sort</span>
            <select className={inputClass} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs text-slate-500">Employee</span>
            <input
              className={inputClass}
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Name or email"
              onKeyDown={(e) => {
                if (e.key === "Enter") load(true);
              }}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Record type</span>
            <input
              className={inputClass}
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              placeholder="work_order, customer…"
              onKeyDown={(e) => {
                if (e.key === "Enter") load(true);
              }}
            />
          </label>
          <div className="flex items-end">
            <button type="button" className={`${btnPrimary} w-full`} onClick={() => load(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Apply search
            </button>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Showing {items.length} of {total} events
      </p>

      {loading && !items.length ? (
        <p className="text-slate-500">Loading audit history…</p>
      ) : !items.length ? (
        <EmptyState
          icon={ScrollText}
          title="No audit events"
          text="Actions across the shop will appear here once logging is active."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {items.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className="cursor-pointer bg-slate-950/20 transition hover:bg-slate-900/50"
                      onClick={() => setSelected(row)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatWhen(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{row.actorName || "System"}</p>
                        <p className="text-xs text-slate-500">{row.actorEmail || row.actorKind}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.module}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-100">{row.action}</p>
                        <p className="max-w-[280px] truncate text-xs text-slate-500">{row.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <p>{row.recordType || "—"}</p>
                        <p className="font-mono text-[11px] text-slate-500">{row.recordLabel || row.recordId || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.severity} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(expandedId === row.id ? null : row.id);
                          }}
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition ${expandedId === row.id ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {expandedId === row.id ? (
                      <tr className="bg-slate-950/40">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <JsonBlock label="Before" value={row.oldValue} />
                            <JsonBlock label="After" value={row.newValue} />
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            {row.ipAddress || "No IP"} · {row.browser}/{row.os} · {row.device}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore ? (
            <div className="border-t border-slate-800 p-3 text-center">
              <button type="button" className={btnSecondary} onClick={() => load(false)} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <button type="button" className="h-full flex-1" aria-label="Close" onClick={() => setSelected(null)} />
          <aside className="flex h-full w-full max-w-lg flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">Audit event</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{selected.action}</h2>
                <p className="mt-1 text-sm text-slate-400">{selected.description}</p>
              </div>
              <button type="button" className={btnSecondary} onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selected.severity} />
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.module} />
              </div>
              {selected.notes ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
                    Notes for Founder
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-amber-50/95">
                    {selected.notes}
                  </pre>
                </div>
              ) : null}
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">When</dt>
                  <dd className="mt-1 text-slate-200">{formatWhen(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Employee</dt>
                  <dd className="mt-1 text-slate-200">{selected.actorName || "System"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Role</dt>
                  <dd className="mt-1 text-slate-200">{selected.actorRole || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Record</dt>
                  <dd className="mt-1 text-slate-200">
                    {selected.recordType || "—"} {selected.recordId ? `· ${selected.recordId}` : ""}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Device</dt>
                  <dd className="mt-1 text-slate-200">
                    {selected.browser} on {selected.os} ({selected.device}) · {selected.ipAddress || "No IP"}
                  </dd>
                </div>
              </dl>
              <JsonBlock label="Before" value={selected.oldValue} />
              <JsonBlock label="After" value={selected.newValue} />
              {selected.changedFields.length ? (
                <p className="text-xs text-slate-500">Changed fields: {selected.changedFields.join(", ")}</p>
              ) : null}
              {(selected.recordType === "work_order" || selected.recordType === "customer") && selected.recordId ? (
                <a
                  href={selected.recordType === "work_order" ? "/admin#work-orders" : "/admin#users"}
                  className="inline-flex text-sm text-amber-400 hover:text-amber-300"
                >
                  Open related {selected.recordType.replace("_", " ")}
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-800 px-5 py-4">
              <button type="button" className={btnSecondary} onClick={() => copyText(selected.id, "Audit ID")}>
                <ClipboardCopy className="h-4 w-4" /> Copy Audit ID
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => copyText(JSON.stringify(selected, null, 2), "JSON")}
              >
                <ClipboardCopy className="h-4 w-4" /> Copy JSON
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
