export type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";
export type Priority = "normal" | "urgent";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type StaffRole = "owner" | "mechanic" | "dispatcher" | "admin";
export type FleetStatus = "active" | "maintenance" | "retired";
export type RouteStatus = "planned" | "in_progress" | "completed";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerVehicle = {
  id: string;
  customerId: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  plate?: string;
  powertrain?: string;
  notes?: string;
  createdAt: string;
};

export type WorkOrder = {
  id: string;
  customerId?: string;
  customerVehicleId?: string;
  customerName: string;
  phone: string;
  vehicle: string;
  customerConcern?: string;
  service: string;
  status: WorkOrderStatus;
  priority: Priority;
  assignedTo?: string;
  notes?: string;
  internalNotes?: string;
  revenue?: number;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type Booking = {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  service: string;
  date: string;
  time: string;
  address?: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  partNumber: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  unitCost: number;
  sellPrice: number;
  supplier?: string;
  supplierLink?: string;
  vehicleId?: string;
  location?: string;
  updatedAt: string;
};

export type StaffMember = {
  id: string;
  authUserId?: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  lastSignIn?: string | null;
};

export type FleetVehicle = {
  id: string;
  name: string;
  plate: string;
  type: string;
  make?: string;
  model?: string;
  year?: number;
  status: FleetStatus;
  mileage?: number;
  lastService?: string;
};

export type RouteStop = {
  id: string;
  customerName: string;
  address: string;
  time: string;
  service: string;
  completed: boolean;
};

export type RoutePlan = {
  id: string;
  date: string;
  driverId?: string;
  vehicleId?: string;
  stops: RouteStop[];
  status: RouteStatus;
  notes?: string;
};

export type DashboardStats = {
  openWorkOrders: number;
  inProgressWorkOrders: number;
  todayBookings: number;
  pendingBookings: number;
  urgentItems: number;
  mtdRevenue: number;
  lowStockCount: number;
  activeFleet: number;
};
