import type { SiteLogoSet } from "./content-types";
import { parseWorkOrderVehicleLabel } from "./customer-vehicles";
import { workOrderStatusLabel } from "./work-order-status";
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

export type ShopContact = {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  slogan: string;
  sloganAccent: string;
  thankYou: string;
  logoUrl: string;
  /** Per-place logos, already resolved to the default when not overridden. */
  logos: SiteLogoSet;
};

/** Fallback letterhead used until Site Contents business info loads. */
export const SHOP_CONTACT: ShopContact = {
  businessName: "Morton's Mechanical LLC",
  logoUrl: "/logo.png",
  logos: {
    header: "/logo.png",
    footer: "/logo.png",
    dashboard: "/logo.png",
    staffLogin: "/logo.png",
    customerPortal: "/logo.png",
    documents: "/logo.png",
  },
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
    inventoryId: undefined,
  }));
}

export function isFilledPartLine(line: WorkOrderPartLine) {
  return Boolean(
    line.description?.trim() ||
      line.partNumber?.trim() ||
      (line.qty != null && Number(line.qty) > 0),
  );
}

/** Filled part rows on the work-order document, with their document indices. */
export function getWorkOrderParts(order: WorkOrder) {
  const fields = resolveDocumentFields(order, "work-order");
  return fields.parts
    .map((line, index) => ({ index, line }))
    .filter(({ line }) => isFilledPartLine(line));
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
      inventoryId: line?.inventoryId || undefined,
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
    status: fields.status ?? "",
    priority: fields.priority ?? "",
    vehicle: {
      make: fields.vehicle?.make ?? "",
      year: fields.vehicle?.year ?? "",
      plate: fields.vehicle?.plate ?? "",
      color: fields.vehicle?.color ?? "",
      model: fields.vehicle?.model ?? "",
      trim: fields.vehicle?.trim ?? "",
      vin: fields.vehicle?.vin ?? "",
      mileage: fields.vehicle?.mileage ?? "",
      engine: fields.vehicle?.engine ?? "",
      notes: fields.vehicle?.notes ?? "",
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

  const concern = order.customerConcern?.trim() || "";
  const service = order.service?.trim() || "";

  // Each work order field lands in exactly one document field, never two.
  // Customer's concern -> Requested services (falls back to the work description).
  // Work description -> Work description panel, unless it is already the requested service.
  const requested = concern || service;
  const services = emptyServiceLines();
  if (requested) {
    services[0] = {
      description: requested,
      estLabor: order.revenue != null && order.revenue > 0 ? Number(order.revenue) : null,
    };
  }
  const workDescription = service && service !== requested ? service : "";

  const story = order.documentData?.storyCorrections?.trim() || "";
  const liveParts = order.documentData?.documents?.["work-order"]?.parts;

  return normalizeDocumentFields({
    workOrderNumber: formatOrderNumber(order.id),
    date: toInputDate(order.createdAt) || toInputDate(new Date().toISOString()),
    promisedDate: toInputDate(order.scheduledDate),
    advisor: options?.advisorName?.trim() || "",
    status: workOrderStatusLabel(order.status),
    priority: order.priority === "urgent" ? "Urgent" : "Normal",
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
      model: vehicle?.model || parsed.model || "",
      trim: vehicle?.trim || "",
      vin: vehicle?.vin || "",
      mileage: vehicle?.mileage != null ? String(vehicle.mileage) : "",
      engine: vehicle?.powertrain || "",
      notes: vehicle?.notes || "",
    },
    services,
    technicianNotes: [order.internalNotes?.trim(), story].filter(Boolean).join("\n\n"),
    parts: liveParts?.length ? liveParts : emptyPartLines(),
    workDescription,
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

/** Prefer non-empty live values so document fields stay synced with other editors. */
function preferLive(live: string, saved: string) {
  const next = live.trim();
  return next || saved;
}

function syncPartsFromWorkOrder(order: WorkOrder, savedParts: WorkOrderPartLine[]) {
  const woParts = order.documentData?.documents?.["work-order"]?.parts;
  const filledWo = (woParts ?? []).filter(isFilledPartLine);
  if (filledWo.length) return ensurePartRows(woParts);
  return ensurePartRows(savedParts);
}

function syncServicesFromLive(
  defaults: WorkOrderDocumentFields,
  saved: WorkOrderDocumentFields,
): WorkOrderServiceLine[] {
  const next = ensureServiceRows(saved.services);
  const live = defaults.services[0];
  if (live?.description.trim()) {
    next[0] = {
      description: live.description,
      estLabor: next[0].estLabor ?? live.estLabor,
    };
  } else if (!next.some((line) => line.description.trim() || line.estLabor != null)) {
    return defaults.services;
  }
  return next;
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
  const defaults = buildDefaultDocumentFields(order, { ...options, kind });
  const saved = order.documentData?.documents?.[kind];
  if (!saved) return defaults;

  const normalized = normalizeDocumentFields(saved);

  return normalizeDocumentFields({
    ...normalized,
    workOrderNumber: defaults.workOrderNumber,
    date: preferLive(defaults.date, normalized.date) || normalized.date,
    // Due date / advisor / customer / vehicle always follow the live work order editors.
    promisedDate: defaults.promisedDate || normalized.promisedDate,
    advisor: preferLive(defaults.advisor, normalized.advisor),
    status: defaults.status || normalized.status,
    priority: defaults.priority || normalized.priority,
    customer: {
      name: preferLive(defaults.customer.name, normalized.customer.name),
      phone: preferLive(defaults.customer.phone, normalized.customer.phone),
      email: preferLive(defaults.customer.email, normalized.customer.email),
      address: preferLive(defaults.customer.address, normalized.customer.address),
    },
    vehicle: {
      make: preferLive(defaults.vehicle.make, normalized.vehicle.make),
      year: preferLive(defaults.vehicle.year, normalized.vehicle.year),
      plate: preferLive(defaults.vehicle.plate, normalized.vehicle.plate),
      color: preferLive(defaults.vehicle.color, normalized.vehicle.color),
      model: preferLive(defaults.vehicle.model, normalized.vehicle.model),
      trim: preferLive(defaults.vehicle.trim, normalized.vehicle.trim),
      vin: preferLive(defaults.vehicle.vin, normalized.vehicle.vin),
      mileage: preferLive(defaults.vehicle.mileage, normalized.vehicle.mileage),
      engine: preferLive(defaults.vehicle.engine, normalized.vehicle.engine),
      notes: preferLive(defaults.vehicle.notes, normalized.vehicle.notes),
    },
    services: syncServicesFromLive(defaults, normalized),
    technicianNotes: preferLive(defaults.technicianNotes, normalized.technicianNotes),
    parts: syncPartsFromWorkOrder(order, normalized.parts),
    workDescription: preferLive(defaults.workDescription, normalized.workDescription),
    notes: preferLive(defaults.notes, normalized.notes),
  });
}

/**
 * Keep work-order + estimate (and invoice if present) documents filled from the live order.
 * Preserves document-only edits like signatures and tax via resolveDocumentFields merge.
 */
export async function hydrateWorkOrderDocuments(
  order: WorkOrder,
  options?: {
    advisorName?: string;
    customer?: Customer | null;
    vehicle?: CustomerVehicle | null;
  },
): Promise<WorkOrder> {
  const prev = order.documentData ?? {};
  const documents = { ...(prev.documents ?? {}) };
  const base = { ...order, documentData: prev };

  const workOrderFields = resolveDocumentFields(base, "work-order", options);
  documents["work-order"] = workOrderFields;

  const withWo = {
    ...base,
    documentData: { ...prev, documents: { ...documents } },
  };
  documents.estimate = resolveDocumentFields(withWo, "estimate", options);

  if (prev.documents?.invoice) {
    documents.invoice = resolveDocumentFields(
      { ...withWo, documentData: { ...prev, documents: { ...documents } } },
      "invoice",
      options,
    );
  }

  return {
    ...order,
    documentData: {
      ...prev,
      viewToken: prev.viewToken || createViewToken(),
      documents,
    },
  };
}

/** @deprecated Prefer the fillable React editor. Kept for emergency fallback. */
export function openWorkOrderDocument() {
  return false;
}
