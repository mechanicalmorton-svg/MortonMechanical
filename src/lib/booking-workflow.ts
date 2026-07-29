import { formatCustomerVehicleLabel } from "@/lib/customer-vehicles";
import { writeAuditEvent } from "@/lib/audit-log";
import {
  createId,
  getCustomerById,
  getCustomerVehicleById,
  loadRoutes,
  loadStaff,
  loadWorkOrders,
  upsertBooking,
  upsertRoute,
  upsertWorkOrder,
} from "@/lib/shop-data";
import type { Booking, RoutePlan, RouteStop, WorkOrder } from "@/lib/shop-types";
import { hydrateWorkOrderDocuments } from "@/lib/work-order-documents";

export type BookingOrchestrationResult = {
  booking: Booking;
  workOrder: WorkOrder | null;
  route: RoutePlan | null;
  spawnedWorkOrder: boolean;
  syncedRouteStop: boolean;
  skippedReason?: string;
};

function shouldOrchestrate(booking: Booking) {
  return booking.status === "confirmed" || booking.status === "completed";
}

async function fillWorkOrderDocuments(order: WorkOrder, customer: Awaited<ReturnType<typeof getCustomerById>>, vehicle: Awaited<ReturnType<typeof getCustomerVehicleById>>) {
  const staff = order.assignedTo ? await loadStaff() : [];
  const advisorName = order.assignedTo
    ? staff.find((member) => member.id === order.assignedTo)?.name
    : undefined;
  return hydrateWorkOrderDocuments(order, { customer, vehicle, advisorName });
}

/**
 * Idempotent booking → work order → route stop orchestration.
 * Requires customer + customer vehicle + assignee + date to fully sync a route stop.
 * Partial data still links a work order when possible.
 */
export async function orchestrateBookingConfirmed(booking: Booking): Promise<BookingOrchestrationResult> {
  if (!shouldOrchestrate(booking)) {
    return {
      booking,
      workOrder: null,
      route: null,
      spawnedWorkOrder: false,
      syncedRouteStop: false,
      skippedReason: "Booking is not confirmed or completed.",
    };
  }

  if (!booking.customerId?.trim()) {
    return {
      booking,
      workOrder: null,
      route: null,
      spawnedWorkOrder: false,
      syncedRouteStop: false,
      skippedReason: "Customer is required before orchestration.",
    };
  }

  if (!booking.customerVehicleId?.trim()) {
    return {
      booking,
      workOrder: null,
      route: null,
      spawnedWorkOrder: false,
      syncedRouteStop: false,
      skippedReason: "Customer vehicle is required before orchestration.",
    };
  }

  const customer = await getCustomerById(booking.customerId);
  if (!customer) {
    throw new Error("Selected customer was not found.");
  }

  const vehicle = await getCustomerVehicleById(booking.customerVehicleId);
  if (!vehicle) {
    throw new Error("Selected customer vehicle was not found.");
  }
  if (vehicle.customerId !== customer.id) {
    throw new Error("Vehicle does not belong to this customer.");
  }

  const vehicleLabel = formatCustomerVehicleLabel(vehicle);
  const now = new Date().toISOString();
  const concern = booking.problemDescription?.trim() || booking.notes?.trim() || "";
  const locationBits = [
    booking.locationType ? `Location: ${booking.locationType}` : "",
    booking.gateCode?.trim() ? `Gate/entry code: ${booking.gateCode.trim()}` : "",
    booking.accessNotes?.trim() ? `Access: ${booking.accessNotes.trim()}` : "",
    booking.lat != null && booking.lng != null
      ? `GPS: ${booking.lat.toFixed(6)}, ${booking.lng.toFixed(6)}`
      : "",
    booking.photoUrls?.length ? `Site photos: ${booking.photoUrls.length}` : "",
  ].filter(Boolean);
  const woNotes = [booking.notes?.trim(), ...locationBits].filter(Boolean).join("\n") || undefined;
  const stopNotes = [
    booking.gateCode?.trim() ? `Gate: ${booking.gateCode.trim()}` : "",
    booking.accessNotes?.trim() || "",
  ]
    .filter(Boolean)
    .join(" · ");

  let spawnedWorkOrder = false;
  let workOrder: WorkOrder | null = null;

  if (booking.workOrderId) {
    const existing = (await loadWorkOrders()).find((order) => order.id === booking.workOrderId) ?? null;
    if (existing) {
      workOrder = {
        ...existing,
        customerId: customer.id,
        customerVehicleId: vehicle.id,
        bookingId: booking.id,
        customerName: customer.name || booking.customerName,
        phone: customer.phone || booking.phone,
        vehicle: vehicleLabel,
        customerConcern: concern || existing.customerConcern,
        service: booking.service || existing.service,
        serviceId: booking.serviceId || existing.serviceId,
        assignedTo: booking.assignedTo || existing.assignedTo,
        scheduledDate: booking.date || existing.scheduledDate,
        notes: woNotes ?? existing.notes,
        updatedAt: now,
      };
      if (workOrder.status === "draft") {
        workOrder.status = "scheduled";
      }
      workOrder = await fillWorkOrderDocuments(workOrder, customer, vehicle);
      await upsertWorkOrder(workOrder);
    }
  }

  if (!workOrder) {
    spawnedWorkOrder = true;
    workOrder = {
      id: createId(),
      customerId: customer.id,
      customerVehicleId: vehicle.id,
      bookingId: booking.id,
      customerName: customer.name || booking.customerName,
      phone: customer.phone || booking.phone,
      vehicle: vehicleLabel,
      customerConcern: concern,
      service: booking.service || "General service",
      serviceId: booking.serviceId,
      status: "scheduled",
      priority: "normal",
      assignedTo: booking.assignedTo,
      notes: woNotes,
      paymentStatus: "unpaid",
      scheduledDate: booking.date,
      createdAt: now,
      updatedAt: now,
    };
    workOrder = await fillWorkOrderDocuments(workOrder, customer, vehicle);
    await upsertWorkOrder(workOrder);
    void writeAuditEvent({
      module: "bookings",
      action: "work_order_spawned",
      description: `Work order created from booking for ${booking.customerName}`,
      recordType: "work_order",
      recordId: workOrder.id,
      recordLabel: booking.customerName,
      newValue: { bookingId: booking.id, workOrderId: workOrder.id },
      severity: "notice",
      page: "/admin#bookings",
    });
  }

  let nextBooking: Booking = {
    ...booking,
    customerId: customer.id,
    customerVehicleId: vehicle.id,
    workOrderId: workOrder.id,
    durationMinutes: booking.durationMinutes ?? 60,
  };
  await upsertBooking(nextBooking);

  let route: RoutePlan | null = null;
  let syncedRouteStop = false;

  if (booking.assignedTo?.trim() && booking.date) {
    const routes = await loadRoutes();
    route =
      routes.find((item) => item.date === booking.date && item.driverId === booking.assignedTo) ?? null;

    const stopPayload: RouteStop = {
      id: createId(),
      customerName: customer.name || booking.customerName,
      address: booking.address?.trim() || customer.address?.trim() || "Address TBD",
      time: booking.time || "09:00",
      service: booking.service || "General service",
      completed: booking.status === "completed",
      bookingId: booking.id,
      workOrderId: workOrder.id,
      customerId: customer.id,
      customerVehicleId: vehicle.id,
      notes: stopNotes || undefined,
      lat: booking.lat,
      lng: booking.lng,
    };

    if (!route) {
      route = {
        id: createId(),
        date: booking.date,
        driverId: booking.assignedTo,
        stops: [stopPayload],
        status: "planned",
        notes: "Auto-created from booking orchestration",
      };
      await upsertRoute(route);
      syncedRouteStop = true;
    } else {
      const existingIdx = route.stops.findIndex((stop) => stop.bookingId === booking.id);
      const stops = [...route.stops];
      if (existingIdx >= 0) {
        stops[existingIdx] = {
          ...stops[existingIdx],
          ...stopPayload,
          id: stops[existingIdx].id,
          completed: stops[existingIdx].completed || stopPayload.completed,
        };
      } else {
        stops.push(stopPayload);
      }
      route = {
        ...route,
        stops,
        status:
          route.status === "completed" || stops.every((stop) => stop.completed)
            ? "completed"
            : stops.length
              ? "in_progress"
              : "planned",
      };
      await upsertRoute(route);
      syncedRouteStop = true;
    }

    void writeAuditEvent({
      module: "bookings",
      action: "route_stop_synced",
      description: `Route stop synced for booking ${booking.customerName}`,
      recordType: "route",
      recordId: route.id,
      recordLabel: route.date,
      newValue: { bookingId: booking.id, workOrderId: workOrder.id, driverId: booking.assignedTo },
      severity: "notice",
      page: "/admin#routes-manager",
    });
  }

  void writeAuditEvent({
    module: "bookings",
    action: "booking_orchestrated",
    description: `Booking orchestrated for ${booking.customerName}`,
    recordType: "booking",
    recordId: booking.id,
    recordLabel: booking.customerName,
    newValue: {
      workOrderId: workOrder.id,
      routeId: route?.id,
      spawnedWorkOrder,
      syncedRouteStop,
    },
    severity: "notice",
    page: "/admin#bookings",
  });

  return {
    booking: nextBooking,
    workOrder,
    route,
    spawnedWorkOrder,
    syncedRouteStop,
  };
}

/** Prefer confirm orchestration; kept as alias for create flows that land as confirmed. */
export async function orchestrateBookingCreated(booking: Booking) {
  if (booking.status === "pending") {
    return {
      booking,
      workOrder: null,
      route: null,
      spawnedWorkOrder: false,
      syncedRouteStop: false,
      skippedReason: "Pending bookings are not orchestrated until confirmed.",
    } satisfies BookingOrchestrationResult;
  }
  return orchestrateBookingConfirmed(booking);
}
