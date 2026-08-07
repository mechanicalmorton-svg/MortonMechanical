"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import type { WorkOrderDocumentFields, WorkOrderDocumentKind } from "@/lib/shop-types";
import { DOCUMENT_TITLES } from "@/lib/work-order-documents";
import { useShopContact } from "@/lib/use-shop-contact";
import { WorkOrderDocumentForm } from "@/components/work-order/WorkOrderDocumentForm";

function parseKind(value: string | null): WorkOrderDocumentKind {
  if (value === "estimate" || value === "invoice" || value === "work-order") return value;
  return "work-order";
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-600">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

function WorkOrderCustomerView() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() || "";
  const kind = useMemo(() => parseKind(params.get("kind")), [params]);
  const shop = useShopContact();

  const [fields, setFields] = useState<WorkOrderDocumentFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setError("This customer view link is missing a token.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/work-orders/document?token=${encodeURIComponent(token)}&kind=${encodeURIComponent(kind)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(data.error || "Could not load document.");
            setFields(null);
          }
          return;
        }
        if (!cancelled) setFields(data.fields as WorkOrderDocumentFields);
      } catch {
        if (!cancelled) setError("Network error while loading the document.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, kind]);

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900">
      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-300 bg-white/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
            {shop.businessName}
          </p>
          <h1 className="text-lg font-semibold">{DOCUMENT_TITLES[kind]}</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A1931] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12284a]"
          disabled={!fields}
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      <div className="px-3 py-6 sm:px-6">
        {loading ? (
          <LoadingState label="Loading document…" />
        ) : error ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-red-700">Unable to open document</p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        ) : fields ? (
          <div className="wo-print-root mx-auto max-w-[8.5in]">
            <WorkOrderDocumentForm kind={kind} value={fields} readOnly />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function WorkOrderCustomerViewPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading document…" />}>
      <WorkOrderCustomerView />
    </Suspense>
  );
}
