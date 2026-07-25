"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Loader2, Printer, Save, X } from "lucide-react";
import type {
  Customer,
  CustomerVehicle,
  WorkOrder,
  WorkOrderDocumentData,
  WorkOrderDocumentFields,
  WorkOrderDocumentKind,
} from "@/lib/shop-types";
import {
  createViewToken,
  DOCUMENT_TITLES,
  resolveDocumentFields,
} from "@/lib/work-order-documents";
import { WorkOrderDocumentForm } from "@/components/work-order/WorkOrderDocumentForm";
import { adminGet, adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { btnPrimary, btnSecondary } from "./admin-ui";

type Props = {
  open: boolean;
  kind: WorkOrderDocumentKind;
  order: WorkOrder;
  advisorName?: string;
  onClose: () => void;
  onSaved: (order: WorkOrder) => void;
};

export function WorkOrderDocumentEditor({
  open,
  kind,
  order,
  advisorName,
  onClose,
  onSaved,
}: Props) {
  const toast = useAdminToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<WorkOrderDocumentFields | null>(null);
  const [viewToken, setViewToken] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      let customer: Customer | null = null;
      let vehicle: CustomerVehicle | null = null;

      if (order.customerId) {
        const { data } = await adminGet<Customer[]>(
          `/api/admin/customers?q=${encodeURIComponent(order.customerName || "")}`,
        );
        customer = data?.find((item) => item.id === order.customerId) ?? null;
      }

      if (order.customerVehicleId) {
        const { data } = await adminGet<CustomerVehicle[]>(
          `/api/admin/customers/vehicles?customerId=${encodeURIComponent(order.customerId || "")}`,
        );
        vehicle = data?.find((item) => item.id === order.customerVehicleId) ?? null;
      }

      if (cancelled) return;

      const nextFields = resolveDocumentFields(order, kind, {
        advisorName,
        customer,
        vehicle,
      });
      setFields(nextFields);
      setViewToken(order.documentData?.viewToken || createViewToken());
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, order, kind, advisorName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const title = DOCUMENT_TITLES[kind];
  const customerViewUrl =
    typeof window !== "undefined" && viewToken
      ? `${window.location.origin}/work-order/view?token=${encodeURIComponent(viewToken)}&kind=${encodeURIComponent(kind)}`
      : "";

  async function save() {
    if (!fields) return;
    setSaving(true);

    const documentData: WorkOrderDocumentData = {
      ...(order.documentData ?? {}),
      viewToken,
      documents: {
        ...(order.documentData?.documents ?? {}),
        [kind]: fields,
      },
    };

    const { data, error } = await adminSend<WorkOrder>("/api/admin/work-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, documentData }),
    });

    setSaving(false);

    if (error || !data) {
      const setup = await adminSend<{ sql?: string; message?: string }>("/api/admin/setup-document-data", {
        method: "POST",
      });
      if (setup.data?.sql) {
        toast.error(
          "Database needs a one-time update: run supabase/add-work-order-document-data.sql in Supabase SQL Editor, then Save again.",
        );
      } else {
        toast.error(error || "Could not save document.");
      }
      return;
    }

    toast.success(`${title} saved.`);
    onSaved(data);
  }

  function printDocument() {
    window.print();
  }

  async function openCustomerView() {
    if (!fields || !customerViewUrl) return;
    const needsSave =
      !order.documentData?.documents?.[kind] || order.documentData.viewToken !== viewToken;
    if (needsSave) {
      setSaving(true);
      const documentData: WorkOrderDocumentData = {
        ...(order.documentData ?? {}),
        viewToken,
        documents: {
          ...(order.documentData?.documents ?? {}),
          [kind]: fields,
        },
      };
      const { data, error } = await adminSend<WorkOrder>("/api/admin/work-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, documentData }),
      });
      setSaving(false);
      if (error || !data) {
        toast.error(error || "Save the document before opening the customer view.");
        return;
      }
      onSaved(data);
      toast.success(`${title} saved.`);
    }
    window.open(customerViewUrl, "_blank", "noopener,noreferrer");
  }

  return createPortal(
    <div className="fixed inset-0 z-[170] flex flex-col bg-slate-950/90 backdrop-blur-sm">
      <div className="no-print flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
            Fillable document
          </p>
          <h2 className="admin-glass-title admin-glass-title--sm admin-display max-w-full">
            <span className="admin-glass-title__sheen" aria-hidden />
            <span className="admin-glass-title__text truncate">
              {title} · {order.customerName}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={openCustomerView} disabled={loading || !fields}>
            <ExternalLink className="h-4 w-4" />
            Customer view
          </button>
          <button type="button" className={btnSecondary} onClick={printDocument} disabled={loading || !fields}>
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={loading || saving || !fields}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close document editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-6">
        {loading || !fields ? (
          <div className="flex h-full min-h-[40vh] items-center justify-center text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading document…
          </div>
        ) : (
          <div className="wo-print-root mx-auto w-full max-w-[8.5in]">
            <WorkOrderDocumentForm kind={kind} value={fields} onChange={setFields} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
