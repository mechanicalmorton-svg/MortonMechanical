import type { WorkOrderStatus } from "./shop-types";

export const WORK_ORDER_STATUSES = [
  "draft",
  "scheduled",
  "in_progress",
  "waiting_on_parts",
  "waiting_customer",
  "completed",
  "delivered",
  "cancelled",
] as const;

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  waiting_on_parts: "Waiting on Parts",
  waiting_customer: "Waiting Customer",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Terminal statuses — no longer “active” shop work. */
export const WORK_ORDER_CLOSED_STATUSES: WorkOrderStatus[] = ["completed", "delivered", "cancelled"];

/** Jobs still in the shop / pipeline. */
export const WORK_ORDER_ACTIVE_STATUSES: WorkOrderStatus[] = [
  "draft",
  "scheduled",
  "in_progress",
  "waiting_on_parts",
  "waiting_customer",
];

/** Actively being worked or blocked mid-job. */
export const WORK_ORDER_IN_SHOP_STATUSES: WorkOrderStatus[] = [
  "in_progress",
  "waiting_on_parts",
  "waiting_customer",
];

/** Not yet started on the floor. */
export const WORK_ORDER_QUEUED_STATUSES: WorkOrderStatus[] = ["draft", "scheduled"];

/** Finished successfully (not cancelled). */
export const WORK_ORDER_DONE_STATUSES: WorkOrderStatus[] = ["completed", "delivered"];

export function isWorkOrderStatus(value: unknown): value is WorkOrderStatus {
  return typeof value === "string" && (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}

/** Map legacy DB/UI values onto the current status set. */
export function normalizeWorkOrderStatus(value: unknown): WorkOrderStatus {
  if (isWorkOrderStatus(value)) return value;
  if (value === "open" || value === "pending" || value === "new") return "draft";
  return "draft";
}

export function workOrderStatusLabel(status: string) {
  if (isWorkOrderStatus(status)) return WORK_ORDER_STATUS_LABELS[status];
  if (status === "open" || status === "pending") return WORK_ORDER_STATUS_LABELS.draft;
  return status.replace(/_/g, " ");
}

export function isWorkOrderClosed(status: WorkOrderStatus) {
  return WORK_ORDER_CLOSED_STATUSES.includes(status);
}

export function isWorkOrderActive(status: WorkOrderStatus) {
  return WORK_ORDER_ACTIVE_STATUSES.includes(status);
}
