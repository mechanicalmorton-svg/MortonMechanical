import { readJson, writeJson, newId } from "./store";
import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";
import {
  createPortalUser,
  deletePortalUser,
  loadStaffFromAuth,
  updatePortalUser,
} from "./staff-auth";
import type {
  Booking,
  Customer,
  CustomerVehicle,
  DashboardStats,
  FleetVehicle,
  InventoryItem,
  RoutePlan,
  StaffMember,
  WorkOrder,
} from "./shop-types";
import { formatCustomerVehicleLabel } from "./customer-vehicles";
import {
  isMissingDocumentDataColumn,
  loadWorkOrderDocumentData,
  saveWorkOrderDocumentData,
} from "./work-order-document-store";
import {
  isDefaultInventoryCategory,
  mergeInventoryCategories,
  normalizeCategoryName,
  sortInventoryCategories,
} from "./inventory-categories";
import {
  defaultRoleDefinitions,
  isProtectedRole,
  mergeRoleDefinitions,
  normalizeRoleDefinition,
  normalizeRoleIds,
  pickPrimaryRoleId,
  slugifyRoleId,
  type RoleDefinition,
} from "./role-definitions";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

// --- mappers ---

function rowToWorkOrder(r: Record<string, unknown>): WorkOrder {
  const rawDocument = r.document_data;
  const documentData =
    rawDocument && typeof rawDocument === "object" && !Array.isArray(rawDocument)
      ? (rawDocument as WorkOrder["documentData"])
      : undefined;

  return {
    id: r.id as string,
    customerId: (r.customer_id as string) || undefined,
    customerVehicleId: (r.customer_vehicle_id as string) || undefined,
    customerName: r.customer_name as string,
    phone: (r.phone as string) ?? "",
    vehicle: (r.vehicle as string) ?? "",
    customerConcern: (r.customer_concern as string) || undefined,
    service: r.service as string,
    status: r.status as WorkOrder["status"],
    priority: r.priority as WorkOrder["priority"],
    assignedTo: r.assigned_to as string | undefined,
    notes: r.notes as string | undefined,
    internalNotes: (r.internal_notes as string) || undefined,
    revenue: r.revenue != null ? Number(r.revenue) : undefined,
    paymentStatus: (r.payment_status as WorkOrder["paymentStatus"]) || "unpaid",
    stripeCheckoutSessionId: (r.stripe_checkout_session_id as string) || undefined,
    scheduledDate: r.scheduled_date as string | undefined,
    documentData,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function workOrderToRow(w: WorkOrder) {
  const row: Record<string, unknown> = {
    id: w.id,
    customer_id: w.customerId?.trim() || null,
    customer_vehicle_id: w.customerVehicleId?.trim() || null,
    customer_name: w.customerName,
    phone: w.phone,
    vehicle: w.vehicle,
    customer_concern: w.customerConcern ?? "",
    service: w.service,
    status: w.status,
    priority: w.priority,
    assigned_to: w.assignedTo,
    notes: w.notes,
    internal_notes: w.internalNotes ?? "",
    revenue: w.revenue,
    scheduled_date: w.scheduledDate,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  };

  // Only send when present so older databases without the column can still save other fields.
  if (w.documentData !== undefined) {
    row.document_data = w.documentData ?? {};
  }
  if (w.paymentStatus !== undefined) {
    row.payment_status = w.paymentStatus;
  }
  if (w.stripeCheckoutSessionId !== undefined) {
    row.stripe_checkout_session_id = w.stripeCheckoutSessionId || null;
  }

  return row;
}

function rowToCustomer(r: Record<string, unknown>): Customer {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: (r.phone as string) ?? "",
    email: (r.email as string) || undefined,
    address: (r.address as string) || undefined,
    notes: (r.notes as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function customerToRow(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function rowToCustomerVehicle(r: Record<string, unknown>): CustomerVehicle {
  return {
    id: r.id as string,
    customerId: r.customer_id as string,
    vehicleConfigurationId: r.vehicle_configuration_id != null ? Number(r.vehicle_configuration_id) : undefined,
    year: r.year != null ? Number(r.year) : undefined,
    make: (r.make as string) || undefined,
    model: (r.model as string) || undefined,
    trim: (r.trim as string) || undefined,
    vin: (r.vin as string) || undefined,
    plate: (r.plate as string) || undefined,
    powertrain: (r.powertrain as string) || undefined,
    mileage: r.mileage != null ? Number(r.mileage) : undefined,
    color: (r.color as string) || undefined,
    notes: (r.notes as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function customerVehicleToRow(v: CustomerVehicle) {
  return {
    id: v.id,
    customer_id: v.customerId,
    vehicle_configuration_id: v.vehicleConfigurationId ?? null,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    vin: v.vin,
    plate: v.plate,
    powertrain: v.powertrain,
    mileage: v.mileage,
    color: v.color,
    notes: v.notes,
    created_at: v.createdAt,
  };
}

function rowToBooking(r: Record<string, unknown>): Booking {
  return {
    id: r.id as string,
    customerId: (r.customer_id as string) || undefined,
    quoteId: (r.quote_id as string) || undefined,
    customerName: r.customer_name as string,
    phone: (r.phone as string) ?? "",
    email: (r.email as string) || undefined,
    service: r.service as string,
    date: r.date as string,
    time: r.time as string,
    address: (r.address as string) || undefined,
    status: r.status as Booking["status"],
    notes: (r.notes as string) || undefined,
    depositPaid: Boolean(r.deposit_paid),
    stripeCheckoutSessionId: (r.stripe_checkout_session_id as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function bookingToRow(b: Booking) {
  const row: Record<string, unknown> = {
    id: b.id,
    customer_id: b.customerId?.trim() || null,
    quote_id: b.quoteId?.trim() || null,
    customer_name: b.customerName,
    phone: b.phone,
    email: b.email ?? "",
    service: b.service,
    date: b.date,
    time: b.time,
    address: b.address ?? "",
    status: b.status,
    notes: b.notes ?? "",
    created_at: b.createdAt,
  };
  if (b.depositPaid !== undefined) {
    row.deposit_paid = b.depositPaid;
  }
  if (b.stripeCheckoutSessionId !== undefined) {
    row.stripe_checkout_session_id = b.stripeCheckoutSessionId || null;
  }
  return row;
}

function rowToInventory(r: Record<string, unknown>): InventoryItem {
  return {
    id: r.id as string,
    name: r.name as string,
    partNumber: (r.part_number as string) ?? "",
    sku: (r.sku as string) ?? "",
    category: (r.category as string) ?? "General",
    quantity: Number(r.quantity),
    minStock: Number(r.min_stock),
    unitCost: Number(r.unit_cost),
    sellPrice: Number(r.sell_price ?? 0),
    supplier: r.supplier as string | undefined,
    supplierLink: (r.supplier_link as string) || undefined,
    vehicleId: (r.vehicle_id as string) || undefined,
    location: r.location as string | undefined,
    updatedAt: r.updated_at as string,
  };
}

function inventoryToRow(i: InventoryItem) {
  return {
    id: i.id,
    name: i.name,
    part_number: i.partNumber,
    sku: i.sku,
    category: i.category,
    quantity: i.quantity,
    min_stock: i.minStock,
    unit_cost: i.unitCost,
    sell_price: i.sellPrice,
    supplier: i.supplier,
    supplier_link: i.supplierLink ?? "",
    vehicle_id: i.vehicleId ?? "",
    location: i.location,
    updated_at: i.updatedAt,
  };
}

function rowToFleet(r: Record<string, unknown>): FleetVehicle {
  return {
    id: r.id as string,
    name: r.name as string,
    plate: r.plate as string,
    type: (r.type as string) ?? "Service Van",
    make: r.make as string | undefined,
    model: r.model as string | undefined,
    year: r.year != null ? Number(r.year) : undefined,
    status: r.status as FleetVehicle["status"],
    mileage: r.mileage != null ? Number(r.mileage) : undefined,
    lastService: r.last_service as string | undefined,
  };
}

function fleetToRow(v: FleetVehicle) {
  return {
    id: v.id,
    name: v.name,
    plate: v.plate,
    type: v.type,
    make: v.make,
    model: v.model,
    year: v.year,
    status: v.status,
    mileage: v.mileage,
    last_service: v.lastService,
  };
}

function rowToRoute(r: Record<string, unknown>): RoutePlan {
  return {
    id: r.id as string,
    date: r.date as string,
    driverId: r.driver_id as string | undefined,
    vehicleId: r.vehicle_id as string | undefined,
    stops: (r.stops as RoutePlan["stops"]) ?? [],
    status: r.status as RoutePlan["status"],
    notes: r.notes as string | undefined,
  };
}

function routeToRow(r: RoutePlan) {
  return {
    id: r.id,
    date: r.date,
    driver_id: r.driverId,
    vehicle_id: r.vehicleId,
    stops: r.stops,
    status: r.status,
    notes: r.notes,
  };
}

// --- load / save ---

export async function loadWorkOrders(): Promise<WorkOrder[]> {
  if (useDatabase()) {
    const client = requireAdminClient();
    const primary = await client.from("work_orders").select("*").order("updated_at", { ascending: false });

    if (primary.error && isMissingDocumentDataColumn(primary.error.message)) {
      const fallback = await client
        .from("work_orders")
        .select(
          "id, customer_id, customer_vehicle_id, customer_name, phone, vehicle, customer_concern, service, status, priority, assigned_to, notes, internal_notes, revenue, scheduled_date, created_at, updated_at",
        )
        .order("updated_at", { ascending: false });
      throwOnError(fallback.error, "Could not load work orders");
      const orders = (fallback.data ?? []).map(rowToWorkOrder);
      await Promise.all(
        orders.map(async (order) => {
          const stored = await loadWorkOrderDocumentData(order.id);
          if (stored) order.documentData = stored;
        }),
      );
      return orders;
    }

    throwOnError(primary.error, "Could not load work orders");
    return (primary.data ?? []).map(rowToWorkOrder);
  }
  return readJson("work-orders.json", []);
}

function isMissingStripePaymentColumn(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    (lower.includes("payment_status") ||
      lower.includes("stripe_checkout_session_id") ||
      lower.includes("deposit_paid")) &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("column"))
  );
}

export async function upsertWorkOrder(item: WorkOrder) {
  if (useDatabase()) {
    const client = requireAdminClient();
    const row = workOrderToRow(item);
    const { error } = await client.from("work_orders").upsert(row);

    if (error && isMissingDocumentDataColumn(error.message)) {
      const { document_data: _documentData, ...rowWithoutDocument } = row;
      const retry = await client.from("work_orders").upsert(rowWithoutDocument);
      throwOnError(retry.error, "Could not save work order");
      if (item.documentData) {
        try {
          await saveWorkOrderDocumentData(item.id, item.documentData);
        } catch (storageError) {
          throw new Error(
            `Could not save work order documents. Run supabase/add-work-order-document-data.sql in the Supabase SQL editor, then try again. (${
              storageError instanceof Error ? storageError.message : "storage unavailable"
            })`,
          );
        }
      }
      return;
    }

    if (error && isMissingStripePaymentColumn(error.message)) {
      const {
        payment_status: _paymentStatus,
        stripe_checkout_session_id: _sessionId,
        ...rowWithoutPayment
      } = row;
      const retry = await client.from("work_orders").upsert(rowWithoutPayment);
      throwOnError(
        retry.error,
        "Could not save work order. Run supabase/add-stripe-payments.sql in the Supabase SQL editor, then try again.",
      );
      return;
    }

    throwOnError(error, "Could not save work order");

    // Keep a storage copy as backup even when the column exists.
    if (item.documentData) {
      try {
        await saveWorkOrderDocumentData(item.id, item.documentData);
      } catch {
        // Column save succeeded; storage backup is optional.
      }
    }
    return;
  }
  const items = await loadWorkOrders();
  const idx = items.findIndex((w) => w.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("work-orders.json", items);
}

export async function deleteWorkOrder(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("work_orders").delete().eq("id", id);
    throwOnError(error, "Could not delete work order");
    return;
  }
  writeJson("work-orders.json", (await loadWorkOrders()).filter((w) => w.id !== id));
}

export async function loadCustomers(query?: string): Promise<Customer[]> {
  if (useDatabase()) {
    let request = requireAdminClient().from("customers").select("*").order("name");
    const { data, error } = await request;
    throwOnError(error, "Could not load customers");
    let customers = (data ?? []).map(rowToCustomer);
    const q = query?.trim().toLowerCase();
    if (q) {
      customers = customers.filter((customer) =>
        [customer.name, customer.phone, customer.email ?? "", customer.address ?? ""].join(" ").toLowerCase().includes(q),
      );
    }
    return customers;
  }
  const q = query?.trim().toLowerCase();
  const customers = readJson<Customer[]>("customers.json", []);
  if (!q) return customers.sort((a, b) => a.name.localeCompare(b.name));
  return customers
    .filter((customer) =>
      [customer.name, customer.phone, customer.email ?? "", customer.address ?? ""].join(" ").toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertCustomer(item: Customer) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customers").upsert(customerToRow(item));
    throwOnError(error, "Could not save customer");
    return;
  }
  const items = await loadCustomers();
  const idx = items.findIndex((c) => c.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("customers.json", items);
}

export async function deleteCustomer(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customers").delete().eq("id", id);
    throwOnError(error, "Could not delete customer");
    return;
  }
  writeJson("customers.json", (await loadCustomers()).filter((c) => c.id !== id));
  writeJson(
    "customer-vehicles.json",
    (await loadCustomerVehicles()).filter((v) => v.customerId !== id),
  );
}

export async function loadCustomerVehicles(customerId?: string): Promise<CustomerVehicle[]> {
  if (useDatabase()) {
    let request = requireAdminClient().from("customer_vehicles").select("*").order("created_at", { ascending: false });
    if (customerId) request = request.eq("customer_id", customerId);
    const { data, error } = await request;
    throwOnError(error, "Could not load customer vehicles");
    return (data ?? []).map(rowToCustomerVehicle);
  }
  const vehicles = readJson<CustomerVehicle[]>("customer-vehicles.json", []);
  const filtered = customerId ? vehicles.filter((v) => v.customerId === customerId) : vehicles;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertCustomerVehicle(item: CustomerVehicle) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customer_vehicles").upsert(customerVehicleToRow(item));
    throwOnError(error, "Could not save customer vehicle");
    return;
  }
  const items = await loadCustomerVehicles();
  const idx = items.findIndex((v) => v.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("customer-vehicles.json", items);
}

export async function deleteCustomerVehicle(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customer_vehicles").delete().eq("id", id);
    throwOnError(error, "Could not delete customer vehicle");
    return;
  }
  writeJson("customer-vehicles.json", (await loadCustomerVehicles()).filter((v) => v.id !== id));
}

export async function getCustomerById(id: string) {
  const customers = await loadCustomers();
  return customers.find((customer) => customer.id === id) ?? null;
}

/** Find an existing customer by phone/email, or create one from contact details. */
export async function findOrCreateCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}): Promise<Customer> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email?.trim().toLowerCase() || undefined;
  const address = input.address?.trim() || undefined;
  if (!name) throw new Error("Customer name is required.");

  const customers = await loadCustomers();
  const byPhone = phone
    ? customers.find((customer) => customer.phone.replace(/\D/g, "") && customer.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))
    : undefined;
  const byEmail = email
    ? customers.find((customer) => customer.email?.trim().toLowerCase() === email)
    : undefined;
  const existing = byPhone ?? byEmail;
  if (existing) {
    const updated: Customer = {
      ...existing,
      name: name || existing.name,
      phone: phone || existing.phone,
      email: email ?? existing.email,
      address: address ?? existing.address,
      updatedAt: new Date().toISOString(),
    };
    await upsertCustomer(updated);
    return updated;
  }

  const customer: Customer = {
    id: createId(),
    name,
    phone,
    email,
    address,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await upsertCustomer(customer);
  return customer;
}

export async function getCustomerVehicleById(id: string) {
  const vehicles = await loadCustomerVehicles();
  return vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

type WorkOrderVehicleInput = {
  id?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  plate?: string;
  powertrain?: string;
  notes?: string;
};

export async function resolveWorkOrderLinks(input: {
  customerId?: string;
  customerVehicleId?: string;
  customerName?: string;
  phone?: string;
  vehicle?: WorkOrderVehicleInput;
  saveVehicleToFile?: boolean;
}) {
  let customer: Customer | null = null;
  if (input.customerId) {
    customer = await getCustomerById(input.customerId);
    if (!customer) throw new Error("Selected customer was not found.");
  }

  let vehicle: CustomerVehicle | null = null;
  if (input.customerVehicleId) {
    vehicle = await getCustomerVehicleById(input.customerVehicleId);
    if (vehicle) {
      if (customer && vehicle.customerId !== customer.id) throw new Error("Vehicle does not belong to this customer.");
      if (!customer) customer = await getCustomerById(vehicle.customerId);
      if (input.vehicle && hasVehicleDetails(input.vehicle)) {
        vehicle = {
          ...vehicle,
          year: input.vehicle.year ?? vehicle.year,
          make: input.vehicle.make ?? vehicle.make,
          model: input.vehicle.model ?? vehicle.model,
          trim: input.vehicle.trim ?? vehicle.trim,
          vin: input.vehicle.vin ?? vehicle.vin,
          plate: input.vehicle.plate ?? vehicle.plate,
          powertrain: input.vehicle.powertrain ?? vehicle.powertrain,
          notes: input.vehicle.notes ?? vehicle.notes,
        };
        await upsertCustomerVehicle(vehicle);
      }
    }
  } else if (customer && input.vehicle && hasVehicleDetails(input.vehicle) && input.saveVehicleToFile !== false) {
    const now = new Date().toISOString();
    if (input.vehicle.id) {
      const existing = await getCustomerVehicleById(input.vehicle.id);
      if (existing && existing.customerId === customer.id) {
        vehicle = {
          ...existing,
          year: input.vehicle.year ?? existing.year,
          make: input.vehicle.make ?? existing.make,
          model: input.vehicle.model ?? existing.model,
          trim: input.vehicle.trim ?? existing.trim,
          vin: input.vehicle.vin ?? existing.vin,
          plate: input.vehicle.plate ?? existing.plate,
          powertrain: input.vehicle.powertrain ?? existing.powertrain,
          notes: input.vehicle.notes ?? existing.notes,
        };
        await upsertCustomerVehicle(vehicle);
      }
    }
    if (!vehicle) {
      vehicle = {
        id: createId(),
        customerId: customer.id,
        year: input.vehicle.year,
        make: input.vehicle.make,
        model: input.vehicle.model,
        trim: input.vehicle.trim,
        vin: input.vehicle.vin,
        plate: input.vehicle.plate,
        powertrain: input.vehicle.powertrain,
        notes: input.vehicle.notes,
        createdAt: now,
      };
      await upsertCustomerVehicle(vehicle);
    }
  }

  const customerName = customer?.name ?? input.customerName?.trim() ?? "Unknown";
  const phone = customer?.phone ?? input.phone ?? "";
  const vehicleLabel = vehicle ? formatCustomerVehicleLabel(vehicle) : input.vehicle ? formatCustomerVehicleLabel(input.vehicle) : "";

  return {
    customerId: customer?.id,
    customerVehicleId: vehicle?.id,
    customerName,
    phone,
    vehicle: vehicleLabel,
  };
}

function hasVehicleDetails(vehicle: WorkOrderVehicleInput) {
  return Boolean(
    vehicle.year ||
      vehicle.make?.trim() ||
      vehicle.model?.trim() ||
      vehicle.trim?.trim() ||
      vehicle.vin?.trim() ||
      vehicle.plate?.trim() ||
      vehicle.powertrain?.trim(),
  );
}

export async function loadBookings(): Promise<Booking[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    throwOnError(error, "Could not load bookings");
    return (data ?? []).map(rowToBooking);
  }
  return readJson("bookings.json", []);
}

export async function upsertBooking(item: Booking) {
  if (useDatabase()) {
    const client = requireAdminClient();
    const row = bookingToRow(item);
    const { error } = await client.from("bookings").upsert(row);
    if (error && isMissingStripePaymentColumn(error.message)) {
      const {
        deposit_paid: _depositPaid,
        stripe_checkout_session_id: _sessionId,
        ...rowWithoutPayment
      } = row;
      const retry = await client.from("bookings").upsert(rowWithoutPayment);
      throwOnError(retry.error, "Could not save booking");
      return;
    }
    throwOnError(error, "Could not save booking");
    return;
  }
  const items = await loadBookings();
  const idx = items.findIndex((b) => b.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("bookings.json", items);
}

export async function markBookingDepositPaid(bookingId: string, sessionId: string) {
  if (useDatabase()) {
    const client = requireAdminClient();
    const { data, error } = await client.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    throwOnError(error, "Could not load booking for deposit update");
    if (!data) throw new Error("Booking not found.");
    const booking = rowToBooking(data as Record<string, unknown>);
    if (booking.depositPaid) return booking;

    const notes = [booking.notes, "Deposit paid via Stripe."].filter(Boolean).join("\n");
    const status = booking.status === "pending" ? "confirmed" : booking.status;
    const { data: updated, error: updateError } = await client
      .from("bookings")
      .update({
        deposit_paid: true,
        stripe_checkout_session_id: sessionId,
        status,
        notes,
      })
      .eq("id", bookingId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      if (isMissingStripePaymentColumn(updateError.message)) {
        throw new Error(
          "Booking deposit columns are missing. Run supabase/add-stripe-payments.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(updateError, "Could not mark booking deposit paid");
    }
    if (!updated) throw new Error("Booking not found.");
    return rowToBooking(updated as Record<string, unknown>);
  }
  const items = await loadBookings();
  const idx = items.findIndex((b) => b.id === bookingId);
  if (idx < 0) throw new Error("Booking not found.");
  if (items[idx].depositPaid) return items[idx];
  items[idx] = {
    ...items[idx],
    depositPaid: true,
    stripeCheckoutSessionId: sessionId,
    status: items[idx].status === "pending" ? "confirmed" : items[idx].status,
    notes: [items[idx].notes, "Deposit paid via Stripe."].filter(Boolean).join("\n"),
  };
  writeJson("bookings.json", items);
  return items[idx];
}

export async function markWorkOrderInvoicePaid(workOrderId: string, sessionId: string) {
  if (useDatabase()) {
    const client = requireAdminClient();
    const { data, error } = await client.from("work_orders").select("*").eq("id", workOrderId).maybeSingle();
    throwOnError(error, "Could not load work order for payment update");
    if (!data) throw new Error("Work order not found.");
    const order = rowToWorkOrder(data as Record<string, unknown>);
    if (order.paymentStatus === "paid") return order;

    const { data: updated, error: updateError } = await client
      .from("work_orders")
      .update({
        payment_status: "paid",
        stripe_checkout_session_id: sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workOrderId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      if (isMissingStripePaymentColumn(updateError.message)) {
        throw new Error(
          "Work order payment columns are missing. Run supabase/add-stripe-payments.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(updateError, "Could not mark work order paid");
    }
    if (!updated) throw new Error("Work order not found.");
    return rowToWorkOrder(updated as Record<string, unknown>);
  }
  const items = await loadWorkOrders();
  const idx = items.findIndex((w) => w.id === workOrderId);
  if (idx < 0) throw new Error("Work order not found.");
  if (items[idx].paymentStatus === "paid") return items[idx];
  items[idx] = {
    ...items[idx],
    paymentStatus: "paid",
    stripeCheckoutSessionId: sessionId,
    updatedAt: new Date().toISOString(),
  };
  writeJson("work-orders.json", items);
  return items[idx];
}

export async function deleteBooking(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("bookings").delete().eq("id", id);
    throwOnError(error, "Could not delete booking");
    return;
  }
  writeJson("bookings.json", (await loadBookings()).filter((b) => b.id !== id));
}

export async function loadInventory(): Promise<InventoryItem[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient().from("inventory").select("*").order("name");
    throwOnError(error, "Could not load inventory");
    return (data ?? []).map(rowToInventory);
  }
  return readJson<InventoryItem[]>("inventory.json", []).map((item) => ({
    ...item,
    partNumber: item.partNumber ?? "",
    sellPrice: item.sellPrice ?? 0,
    supplierLink: item.supplierLink ?? undefined,
    vehicleId: item.vehicleId ?? undefined,
  }));
}

export async function upsertInventoryItem(item: InventoryItem) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("inventory").upsert(inventoryToRow(item));
    throwOnError(error, "Could not save inventory item");
    return;
  }
  const items = await loadInventory();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("inventory.json", items);
}

export async function deleteInventoryItem(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("inventory").delete().eq("id", id);
    throwOnError(error, "Could not delete inventory item");
    return;
  }
  writeJson("inventory.json", (await loadInventory()).filter((i) => i.id !== id));
}

function isMissingInventoryCategoriesTable(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("inventory_categories") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("relation"))
  );
}

async function loadCustomCategoriesFromStorage(): Promise<string[]> {
  try {
    const client = requireAdminClient();
    const { data, error } = await client.storage.from("shop-settings").download("inventory-categories.json");
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text()) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").map(normalizeCategoryName)
      : [];
  } catch {
    return [];
  }
}

async function saveCustomCategoriesToStorage(categories: string[]) {
  const client = requireAdminClient();
  const { data: buckets } = await client.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === "shop-settings")) {
    const created = await client.storage.createBucket("shop-settings", {
      public: false,
      fileSizeLimit: 256 * 1024,
    });
    if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
      throw created.error;
    }
  }
  const { error } = await client.storage
    .from("shop-settings")
    .upload("inventory-categories.json", JSON.stringify(categories, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
}

async function loadCustomInventoryCategories(): Promise<string[]> {
  if (useDatabase()) {
    const client = requireAdminClient();
    const { data, error } = await client
      .from("inventory_categories")
      .select("name, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error && isMissingInventoryCategoriesTable(error.message)) {
      return loadCustomCategoriesFromStorage();
    }
    throwOnError(error, "Could not load inventory categories");
    return (data ?? [])
      .map((row) => normalizeCategoryName(String((row as { name?: string }).name ?? "")))
      .filter(Boolean);
  }
  return readJson<string[]>("inventory-categories.json", []).map(normalizeCategoryName).filter(Boolean);
}

export async function loadInventoryCategories(): Promise<string[]> {
  const custom = await loadCustomInventoryCategories();
  return sortInventoryCategories(mergeInventoryCategories(custom));
}

export async function addInventoryCategory(rawName: string): Promise<string[]> {
  const name = normalizeCategoryName(rawName);
  if (!name) throw new Error("Category name is required.");
  if (name.length > 48) throw new Error("Category name must be 48 characters or less.");

  const existing = await loadInventoryCategories();
  if (existing.some((item) => item.toLowerCase() === name.toLowerCase())) {
    throw new Error("That category already exists.");
  }

  if (useDatabase()) {
    const client = requireAdminClient();
    const custom = await loadCustomInventoryCategories();
    const nextCustom = sortInventoryCategories([...custom, name]).filter(
      (item) => !isDefaultInventoryCategory(item),
    );

    const { error } = await client.from("inventory_categories").upsert({
      name,
      sort_order: 100 + nextCustom.length,
      created_at: new Date().toISOString(),
    });

    if (error && isMissingInventoryCategoriesTable(error.message)) {
      await saveCustomCategoriesToStorage(nextCustom);
      return sortInventoryCategories(mergeInventoryCategories(nextCustom));
    }
    throwOnError(error, "Could not save inventory category");
    return loadInventoryCategories();
  }

  const custom = await loadCustomInventoryCategories();
  const nextCustom = [...custom, name];
  writeJson("inventory-categories.json", nextCustom);
  return sortInventoryCategories(mergeInventoryCategories(nextCustom));
}

export async function deleteInventoryCategory(rawName: string): Promise<string[]> {
  const name = normalizeCategoryName(rawName);
  if (!name) throw new Error("Category name is required.");
  if (isDefaultInventoryCategory(name)) {
    throw new Error("Built-in categories cannot be deleted.");
  }

  const inventory = await loadInventory();
  if (inventory.some((item) => (item.category || "").toLowerCase() === name.toLowerCase())) {
    throw new Error("Move or re-categorize parts in this category before deleting it.");
  }

  if (useDatabase()) {
    const client = requireAdminClient();
    const { error } = await client.from("inventory_categories").delete().eq("name", name);
    if (error && isMissingInventoryCategoriesTable(error.message)) {
      const nextCustom = (await loadCustomCategoriesFromStorage()).filter(
        (item) => item.toLowerCase() !== name.toLowerCase(),
      );
      await saveCustomCategoriesToStorage(nextCustom);
      return sortInventoryCategories(mergeInventoryCategories(nextCustom));
    }
    throwOnError(error, "Could not delete inventory category");
    return loadInventoryCategories();
  }

  const nextCustom = (await loadCustomInventoryCategories()).filter(
    (item) => item.toLowerCase() !== name.toLowerCase(),
  );
  writeJson("inventory-categories.json", nextCustom);
  return sortInventoryCategories(mergeInventoryCategories(nextCustom));
}

function isMissingStaffRolesTable(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("staff_roles") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("relation"))
  );
}

function roleToRow(role: RoleDefinition) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    system: role.system,
    permissions: role.permissions,
    created_at: role.createdAt,
    updated_at: role.updatedAt,
  };
}

function rowToRole(row: Record<string, unknown>): RoleDefinition {
  return normalizeRoleDefinition({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    color: String(row.color ?? "slate") as RoleDefinition["color"],
    system: Boolean(row.system),
    permissions: row.permissions as RoleDefinition["permissions"],
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  });
}

async function loadRolesFromStorage(): Promise<RoleDefinition[]> {
  try {
    const client = requireAdminClient();
    const { data, error } = await client.storage.from("shop-settings").download("staff-roles.json");
    if (error || !data) return [];
    const parsed = JSON.parse(await data.text()) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is RoleDefinition => Boolean(item && typeof item === "object"))
          .map((item) => normalizeRoleDefinition(item))
      : [];
  } catch {
    return [];
  }
}

async function saveRolesToStorage(roles: RoleDefinition[]) {
  const client = requireAdminClient();
  const { data: buckets } = await client.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === "shop-settings")) {
    const created = await client.storage.createBucket("shop-settings", {
      public: false,
      fileSizeLimit: 512 * 1024,
    });
    if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
      throw created.error;
    }
  }
  const { error } = await client.storage
    .from("shop-settings")
    .upload("staff-roles.json", JSON.stringify(roles, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
}

export async function loadRoleDefinitions(): Promise<RoleDefinition[]> {
  if (useDatabase()) {
    const client = requireAdminClient();
    const { data, error } = await client.from("staff_roles").select("*").order("name");
    if (error && isMissingStaffRolesTable(error.message)) {
      return mergeRoleDefinitions(await loadRolesFromStorage());
    }
    throwOnError(error, "Could not load roles");
    const stored = (data ?? []).map((row) => rowToRole(row as Record<string, unknown>));
    return mergeRoleDefinitions(stored);
  }
  return mergeRoleDefinitions(readJson<RoleDefinition[]>("staff-roles.json", []));
}

async function persistRoleDefinitions(roles: RoleDefinition[]) {
  if (useDatabase()) {
    const client = requireAdminClient();
    const { error } = await client.from("staff_roles").upsert(roles.map(roleToRow));
    if (error && isMissingStaffRolesTable(error.message)) {
      await saveRolesToStorage(roles);
      return;
    }
    throwOnError(error, "Could not save roles");
    return;
  }
  writeJson("staff-roles.json", roles);
}

export async function upsertRoleDefinition(
  input: Partial<RoleDefinition> & { name: string; id?: string },
): Promise<RoleDefinition[]> {
  const roles = await loadRoleDefinitions();
  const stamp = new Date().toISOString();
  const existing = input.id ? roles.find((role) => role.id === input.id) : undefined;

  if (existing?.id === "owner") {
    const next = roles.map((role) =>
      role.id === "owner"
        ? {
            ...role,
            name: input.name.trim() || role.name,
            color: (input.color as RoleDefinition["color"]) || role.color,
            permissions: { tabs: role.permissions.tabs, manageUsers: true, editSiteContent: true },
            updatedAt: stamp,
          }
        : role,
    );
    await persistRoleDefinitions(next);
    return mergeRoleDefinitions(next);
  }

  let id = (input.id || slugifyRoleId(input.name)).trim();
  if (!existing) {
    const reserved = new Set(roles.map((role) => role.id));
    let candidate = id;
    let n = 2;
    while (reserved.has(candidate)) {
      candidate = `${id}-${n}`;
      n += 1;
    }
    id = candidate;
  }

  const nextRole = normalizeRoleDefinition({
    id,
    name: input.name,
    color: input.color,
    system: existing?.system ?? false,
    permissions: input.permissions ?? existing?.permissions,
    createdAt: existing?.createdAt || stamp,
    updatedAt: stamp,
  });

  const next = existing
    ? roles.map((role) => (role.id === existing.id ? nextRole : role))
    : [...roles, nextRole];

  await persistRoleDefinitions(next);
  return mergeRoleDefinitions(next);
}

export async function deleteRoleDefinition(roleId: string): Promise<RoleDefinition[]> {
  const id = roleId.trim();
  const roles = await loadRoleDefinitions();
  const target = roles.find((role) => role.id === id);
  if (!target) throw new Error("Role not found.");
  if (isProtectedRole(target.id)) {
    throw new Error("The Founder role cannot be deleted.");
  }

  const staff = await loadStaff();
  if (
    staff.some((member) => {
      const ids = Array.isArray(member.roleIds) && member.roleIds.length ? member.roleIds : [member.role];
      return ids.includes(id);
    })
  ) {
    throw new Error("Reassign users with this role before deleting it.");
  }

  const next = roles.filter((role) => role.id !== id);

  if (useDatabase()) {
    const client = requireAdminClient();
    const { error } = await client.from("staff_roles").delete().eq("id", id);
    if (error && isMissingStaffRolesTable(error.message)) {
      await saveRolesToStorage(next);
      return mergeRoleDefinitions(next);
    }
    throwOnError(error, "Could not delete role");
    // Keep remaining custom/system overrides persisted for name/color edits.
    await persistRoleDefinitions(next);
    return mergeRoleDefinitions(next);
  }

  writeJson("staff-roles.json", next);
  return mergeRoleDefinitions(next);
}

export async function ensureDefaultRolesSeeded() {
  if (!useDatabase()) return;
  const roles = defaultRoleDefinitions();
  try {
    const client = requireAdminClient();
    const { count, error } = await client
      .from("staff_roles")
      .select("id", { count: "exact", head: true });
    if (error && isMissingStaffRolesTable(error.message)) return;
    if (error || (count ?? 0) > 0) return;
    await client.from("staff_roles").upsert(roles.map(roleToRow));
  } catch {
    /* optional seed */
  }
}

export async function loadStaff(): Promise<StaffMember[]> {
  if (useDatabase()) return loadStaffFromAuth();
  return readJson<StaffMember[]>("staff.json", []).map((member) => {
    const roleIds = normalizeRoleIds(member.roleIds, member.role);
    return {
      ...member,
      roleIds,
      role: pickPrimaryRoleId(roleIds),
    };
  });
}

export async function updateStaffMember(
  id: string,
  patch: Partial<Pick<StaffMember, "name" | "email" | "phone" | "role" | "roleIds" | "active">> & {
    password?: string;
  },
) {
  if (useDatabase()) {
    return updatePortalUser(id, patch);
  }
  const items = await loadStaff();
  const idx = items.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("User not found.");
  const current = items[idx];
  const roleIds =
    patch.roleIds !== undefined || patch.role !== undefined
      ? normalizeRoleIds(patch.roleIds, patch.role ?? current.role)
      : normalizeRoleIds(current.roleIds, current.role);
  const saved: StaffMember = {
    ...current,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    email: patch.email !== undefined ? patch.email.trim().toLowerCase() : current.email,
    phone: patch.phone !== undefined ? patch.phone.trim() : current.phone,
    active: patch.active !== undefined ? Boolean(patch.active) : current.active,
    roleIds,
    role: pickPrimaryRoleId(roleIds),
  };
  if (patch.password) {
    const { updatePassword } = await import("./auth");
    await updatePassword(id, patch.password);
  }
  items[idx] = saved;
  writeJson("staff.json", items);
  return saved;
}

export async function upsertStaffMember(item: StaffMember) {
  return updateStaffMember(item.id, {
    name: item.name,
    email: item.email,
    phone: item.phone,
    role: item.role,
    roleIds: item.roleIds,
    active: item.active,
  });
}

export async function deleteStaffMember(id: string) {
  if (useDatabase()) {
    await deletePortalUser(id);
    return;
  }
  writeJson("staff.json", (await loadStaff()).filter((s) => s.id !== id));
}

export { createPortalUser };

export async function loadFleet(): Promise<FleetVehicle[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient().from("fleet").select("*").order("name");
    throwOnError(error, "Could not load fleet");
    return (data ?? []).map(rowToFleet);
  }
  return readJson<FleetVehicle[]>("fleet.json", []);
}

export async function upsertFleetVehicle(item: FleetVehicle) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("fleet").upsert(fleetToRow(item));
    throwOnError(error, "Could not save fleet vehicle");
    return;
  }
  const items = await loadFleet();
  const idx = items.findIndex((v) => v.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("fleet.json", items);
}

export async function deleteFleetVehicle(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("fleet").delete().eq("id", id);
    throwOnError(error, "Could not delete fleet vehicle");
    return;
  }
  writeJson("fleet.json", (await loadFleet()).filter((v) => v.id !== id));
}

export async function loadRoutes(): Promise<RoutePlan[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("routes")
      .select("*")
      .order("date", { ascending: false });
    throwOnError(error, "Could not load routes");
    return (data ?? []).map(rowToRoute);
  }
  return readJson("routes.json", []);
}

export async function upsertRoute(item: RoutePlan) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("routes").upsert(routeToRow(item));
    throwOnError(error, "Could not save route");
    return;
  }
  const items = await loadRoutes();
  const idx = items.findIndex((r) => r.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("routes.json", items);
}

export async function deleteRoute(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("routes").delete().eq("id", id);
    throwOnError(error, "Could not delete route");
    return;
  }
  writeJson("routes.json", (await loadRoutes()).filter((r) => r.id !== id));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const workOrders = await loadWorkOrders();
  const bookings = await loadBookings();
  const inventory = await loadInventory();
  const fleet = await loadFleet();
  const t = today();
  const ms = monthStart();

  return {
    openWorkOrders: workOrders.filter((w) => w.status === "open").length,
    inProgressWorkOrders: workOrders.filter((w) => w.status === "in_progress").length,
    todayBookings: bookings.filter((b) => b.date === t && b.status !== "cancelled").length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    urgentItems:
      workOrders.filter((w) => w.priority === "urgent" && w.status !== "completed" && w.status !== "cancelled").length +
      inventory.filter((i) => i.minStock > 0 && i.quantity <= i.minStock).length,
    mtdRevenue: workOrders
      .filter((w) => w.status === "completed" && w.updatedAt >= ms)
      .reduce((sum, w) => sum + (w.revenue ?? 0), 0),
    lowStockCount: inventory.filter((i) => i.minStock > 0 && i.quantity <= i.minStock).length,
    activeFleet: fleet.filter((f) => f.status === "active").length,
  };
}

export function createId() {
  return newId();
}
