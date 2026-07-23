import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import {
  getDashboardStats,
  loadBookings,
  loadFleet,
  loadInventory,
  loadRoutes,
  loadStaff,
  loadWorkOrders,
} from "@/lib/shop-data";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const stats = await getDashboardStats();
  const workOrders = await loadWorkOrders();
  const bookings = await loadBookings();
  const today = new Date().toISOString().slice(0, 10);

  return NextResponse.json({
    stats,
    pendingBookings: bookings.filter((b) => b.status === "pending").slice(0, 10),
    inProgressWorkOrders: workOrders.filter((w) => w.status === "in_progress").slice(0, 10),
    todaySchedule: bookings.filter((b) => b.date === today && b.status !== "cancelled"),
    recentWorkOrders: workOrders.slice(0, 5),
    inventoryCount: (await loadInventory()).length,
    staffCount: (await loadStaff()).length,
    fleetCount: (await loadFleet()).length,
    routesCount: (await loadRoutes()).length,
  });
}
