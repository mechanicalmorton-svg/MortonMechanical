"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import type { VehicleGloveboxDoc, VehicleGloveboxKind } from "@/lib/shop-types";
import { VEHICLE_GLOVEBOX_KINDS } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { btnDanger, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

type Props = {
  customerVehicleId: string;
  compact?: boolean;
};

function kindLabel(kind: VehicleGloveboxKind) {
  return VEHICLE_GLOVEBOX_KINDS.find((item) => item.id === kind)?.label ?? "Other";
}

function isExpired(expiresOn?: string) {
  if (!expiresOn) return false;
  return expiresOn < new Date().toISOString().slice(0, 10);
}

export function VehicleGlovebox({ customerVehicleId, compact }: Props) {
  const toast = useAdminToast();
  const [docs, setDocs] = useState<VehicleGloveboxDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<VehicleGloveboxKind>("registration");
  const [expiresOn, setExpiresOn] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await adminGet<VehicleGloveboxDoc[]>(
      `/api/admin/customers/vehicles/glovebox?customerVehicleId=${encodeURIComponent(customerVehicleId)}`,
    );
    if (error) toast.error(error);
    else setDocs(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerVehicleId]);

  async function upload(file: File) {
    setUploading(true);
    const body = new FormData();
    body.set("customerVehicleId", customerVehicleId);
    body.set("kind", kind);
    body.set("file", file);
    if (expiresOn) body.set("expiresOn", expiresOn);
    const { error } = await adminSend("/api/admin/customers/vehicles/glovebox", { method: "POST", body });
    setUploading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Added to glovebox.");
    setExpiresOn("");
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this document from the glovebox?")) return;
    const { error } = await adminSend("/api/admin/customers/vehicles/glovebox", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Document removed.");
      void load();
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">Digital glovebox</p>
          {!compact ? (
            <p className="text-xs text-slate-500">Registration, insurance, and other docs for this vehicle.</p>
          ) : null}
        </div>
        <Can permission="customers.edit">
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${inputClass} w-auto min-w-[8rem]`} value={kind} onChange={(e) => setKind(e.target.value as VehicleGloveboxKind)}>
              {VEHICLE_GLOVEBOX_KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className={`${inputClass} w-auto`}
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              title="Optional expiry date"
            />
            <label className={`${btnSecondary} cursor-pointer ${uploading ? "opacity-60" : ""}`}>
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void upload(file);
                }}
              />
            </label>
          </div>
        </Can>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading glovebox…</p>
      ) : !docs.length ? (
        <p className="text-xs text-slate-500">No documents yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-2.5 py-2"
            >
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm text-slate-200 hover:text-white"
              >
                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">
                  {doc.label || doc.fileName}
                  <span className="ml-2 text-[11px] text-slate-500">{kindLabel(doc.kind)}</span>
                  {doc.expiresOn ? (
                    <span className={`ml-2 text-[11px] ${isExpired(doc.expiresOn) ? "text-rose-300" : "text-slate-500"}`}>
                      {isExpired(doc.expiresOn) ? "Expired" : `Exp ${doc.expiresOn}`}
                    </span>
                  ) : null}
                </span>
              </a>
              <Can permission="customers.edit">
                <button type="button" className={btnDanger} onClick={() => remove(doc.id)} aria-label="Remove document">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Can>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
