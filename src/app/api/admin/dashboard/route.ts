import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { getDashboardStats, loadBookings, loadInventory, loadWorkOrders } from "@/lib/shop-data";
import {
  WORK_ORDER_DONE_STATUSES,
  WORK_ORDER_IN_SHOP_STATUSES,
  WORK_ORDER_QUEUED_STATUSES,
  isWorkOrderActive,
} from "@/lib/work-order-status";

export async function GET() {
  return withAdminAuth(async () => {
    const stats = await getDashboardStats();
    const workOrders = await loadWorkOrders();
    const bookings = await loadBookings();
    const inventory = await loadInventory();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    return NextResponse.json({
      stats,
      pendingBookings: bookings.filter((b) => b.status === "pending").slice(0, 10),
      inProgressWorkOrders: workOrders.filter((w) => WORK_ORDER_IN_SHOP_STATUSES.includes(w.status)).slice(0, 10),
      todaySchedule: bookings.filter((b) => b.date === today && b.status !== "cancelled"),
      openWorkOrders: workOrders.filter((w) => WORK_ORDER_QUEUED_STATUSES.includes(w.status)),
      urgentWorkOrders: workOrders.filter((w) => w.priority === "urgent" && isWorkOrderActive(w.status)),
      lowStockItems: inventory.filter((i) => i.minStock > 0 && i.quantity <= i.minStock),
      mtdCompletedJobs: workOrders.filter(
        (w) => WORK_ORDER_DONE_STATUSES.includes(w.status) && w.updatedAt >= monthStart,
      ),
    });
  });
}
