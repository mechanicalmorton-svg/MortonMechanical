import { parseWorkOrderVehicleLabel } from "./customer-vehicles";
import type {
  Customer,
  CustomerVehicle,
  WorkOrder,
  WorkOrderDocumentFields,
  WorkOrderDocumentKind,
  WorkOrderPartLine,
  WorkOrderServiceLine,
} from "./shop-types";

export type { WorkOrderDocumentKind };

export const DOCUMENT_TITLES: Record<WorkOrderDocumentKind, string> = {
  "work-order": "WORK ORDER",
  estimate: "ESTIMATE",
  invoice: "INVOICE",
};

export const SERVICE_ROW_COUNT = 6;
export const PART_ROW_COUNT = 10;
export const DEFAULT_TAX_PERCENT = 0;

export const SHOP_CONTACT = {
  businessName: "Morton's Mechanical LLC",
  phone: "(555) 123-4567",
  email: "info@mortonsmechanical.com",
  address: "1234 Wrench Way, Springfield, ST 12345",
  slogan: "QUALITY REPAIRS. HONEST SERVICE.",
  sloganAccent: "DRIVEN BY TRUST.",
  thankYou: "Thank You For Your Business!",
};

function emptyServiceLines(count = SERVICE_ROW_COUNT): WorkOrderServiceLine[] {
  return Array.from({ length: count }, () => ({ description: "", estLabor: null }));
}

function emptyPartLines(count = PART_ROW_COUNT): WorkOrderPartLine[] {
  return Array.from({ length: count }, () => ({
    qty: null,
    description: "",
    partNumber: "",
    unitPrice: null,
  }));
}

export function formatOrderNumber(id: string) {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `WO-${compact.slice(-12) || id.slice(0, 12).toUpperCase()}`;
}

export function toInputDate(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function partLineTotal(line: WorkOrderPartLine) {
  const qty = Number(line.qty);
  const unit = Number(line.unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(unit)) return 0;
  return Math.round(qty * unit * 100) / 100;
}

export function sumServiceLabor(services: WorkOrderServiceLine[]) {
  return services.reduce((sum, line) => {
    const amount = Number(line.estLabor);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export function sumPartsTotal(parts: WorkOrderPartLine[]) {
  return parts.reduce((sum, line) => sum + partLineTotal(line), 0);
}

export function calculateDocumentTotals(fields: WorkOrderDocumentFields) {
  const laborTotal = Math.round(sumServiceLabor(fields.services) * 100) / 100;
  const partsTotal = Math.round(sumPartsTotal(fields.parts) * 100) / 100;
  const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;
  const taxPercent = Number(fields.summary.taxPercent) || 0;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const excise = Number(fields.summary.excise) || 0;
  const totalDue = Math.round((subtotal + taxAmount + excise) * 100) / 100;
  return { laborTotal, partsTotal, subtotal, taxPercent, taxAmount, excise, totalDue };
}

function ensureServiceRows(services?: WorkOrderServiceLine[]) {
  const next = emptyServiceLines();
  (services ?? []).slice(0, SERVICE_ROW_COUNT).forEach((line, index) => {
    next[index] = {
      description: line?.description ?? "",
      estLabor: line?.estLabor ?? null,
    };
  });
  return next;
}

function ensurePartRows(parts?: WorkOrderPartLine[]) {
  const next = emptyPartLines();
  (parts ?? []).slice(0, PART_ROW_COUNT).forEach((line, index) => {
    next[index] = {
      qty: line?.qty ?? null,
      description: line?.description ?? "",
      partNumber: line?.partNumber ?? "",
      unitPrice: line?.unitPrice ?? null,
    };
  });
  return next;
}

export function normalizeDocumentFields(fields: WorkOrderDocumentFields): WorkOrderDocumentFields {
  return {
    ...fields,
    services: ensureServiceRows(fields.services),
    parts: ensurePartRows(fields.parts),
    authorization: {
      customerSignature: fields.authorization?.customerSignature ?? "",
      date: fields.authorization?.date ?? "",
      textEmailUpdates: Boolean(fields.authorization?.textEmailUpdates),
      paymentSignature: fields.authorization?.paymentSignature ?? "",
      paymentDate: fields.authorization?.paymentDate ?? "",
    },
    summary: {
      taxPercent: Number(fields.summary?.taxPercent) || 0,
      excise: Number(fields.summary?.excise) || 0,
    },
    customer: {
      name: fields.customer?.name ?? "",
      phone: fields.customer?.phone ?? "",
      email: fields.customer?.email ?? "",
      address: fields.customer?.address ?? "",
    },
    vehicle: {
      make: fields.vehicle?.make ?? "",
      year: fields.vehicle?.year ?? "",
      plate: fields.vehicle?.plate ?? "",
      color: fields.vehicle?.color ?? "",
      model: fields.vehicle?.model ?? "",
      vin: fields.vehicle?.vin ?? "",
      mileage: fields.vehicle?.mileage ?? "",
      engine: fields.vehicle?.engine ?? "",
    },
  };
}

export function createViewToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function buildDefaultDocumentFields(
  order: WorkOrder,
  options?: {
    kind?: WorkOrderDocumentKind;
    advisorName?: string;
    customer?: Customer | null;
    vehicle?: CustomerVehicle | null;
  },
): WorkOrderDocumentFields {
  const parsed = parseWorkOrderVehicleLabel(order.vehicle || "");
  const vehicle = options?.vehicle;
  const customer = options?.customer;

  const services = emptyServiceLines();
  const concern = order.customerConcern?.trim() || "";
  const service = order.service?.trim() || "";
  if (concern || service) {
    services[0] = {
      description: concern && service && concern !== service ? `${concern} — ${service}` : concern || service,
      estLabor: order.revenue != null && order.revenue > 0 ? Number(order.revenue) : null,
    };
  }

  return normalizeDocumentFields({
    workOrderNumber: formatOrderNumber(order.id),
    date: toInputDate(order.createdAt) || toInputDate(new Date().toISOString()),
    promisedDate: toInputDate(order.scheduledDate),
    advisor: options?.advisorName?.trim() || "",
    customer: {
      name: customer?.name || order.customerName || "",
      phone: customer?.phone || order.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
    },
    vehicle: {
      make: vehicle?.make || parsed.make || "",
      year: vehicle?.year != null ? String(vehicle.year) : parsed.year != null ? String(parsed.year) : "",
      plate: vehicle?.plate || parsed.plate || "",
      color: vehicle?.color || "",
      model: [vehicle?.model, vehicle?.trim].filter(Boolean).join(" ") || parsed.model || "",
      vin: vehicle?.vin || "",
      mileage: vehicle?.mileage != null ? String(vehicle.mileage) : "",
      engine: vehicle?.powertrain || "",
    },
    services,
    technicianNotes: order.internalNotes || "",
    parts: emptyPartLines(),
    workDescription: [order.service, order.customerConcern, order.notes].filter(Boolean).join("\n\n"),
    authorization: {
      customerSignature: "",
      date: "",
      textEmailUpdates: false,
      paymentSignature: "",
      paymentDate: "",
    },
    summary: {
      taxPercent: DEFAULT_TAX_PERCENT,
      excise: 0,
    },
    notes: order.notes || "",
  });
}

export function resolveDocumentFields(
  order: WorkOrder,
  kind: WorkOrderDocumentKind,
  options?: {
    advisorName?: string;
    customer?: Customer | null;
    vehicle?: CustomerVehicle | null;
  },
) {
  const saved = order.documentData?.documents?.[kind];
  if (saved) return normalizeDocumentFields(saved);
  return buildDefaultDocumentFields(order, { ...options, kind });
}

/** @deprecated Prefer the fillable React editor. Kept for emergency fallback. */
export function openWorkOrderDocument() {
  return false;
}
