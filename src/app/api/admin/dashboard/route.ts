import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { getDashboardStats, loadBookings, loadWorkOrders } from "@/lib/shop-data";

export async function GET() {
  return withAdminAuth(async () => {
    const stats = await getDashboardStats();
    const workOrders = await loadWorkOrders();
    const bookings = await loadBookings();
    const today = new Date().toISOString().slice(0, 10);

    return NextResponse.json({
      stats,
      pendingBookings: bookings.filter((b) => b.status === "pending").slice(0, 10),
      inProgressWorkOrders: workOrders.filter((w) => w.status === "in_progress").slice(0, 10),
      todaySchedule: bookings.filter((b) => b.date === today && b.status !== "cancelled"),
    });
  });
}
