import { NextResponse } from "next/server";
import { getClientUser } from "@/lib/client-auth";
import { loadBookings, loadCustomerVehicles, loadWorkOrders } from "@/lib/shop-data";

export async function GET() {
  const user = await getClientUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [bookings, workOrders, vehicles] = await Promise.all([
    loadBookings(),
    loadWorkOrders(),
    loadCustomerVehicles(user.customerId),
  ]);

  return NextResponse.json({
    user,
    bookings: bookings
      .filter((booking) => booking.customerId === user.customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10),
    workOrders: workOrders
      .filter((order) => order.customerId === user.customerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10),
    vehicles: vehicles.slice(0, 10),
  });
}
