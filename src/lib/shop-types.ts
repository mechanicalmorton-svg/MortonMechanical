export type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";
export type Priority = "normal" | "urgent";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type StaffRole = "owner" | "mechanic" | "dispatcher" | "admin";
export type FleetStatus = "active" | "maintenance" | "retired";
export type RouteStatus = "planned" | "in_progress" | "completed";

export type WorkOrder = {
  id: string;
  customerName: string;
  phone: string;
  vehicle: string;
  service: string;
  status: WorkOrderStatus;
  priority: Priority;
  assignedTo?: string;
  notes?: string;
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
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  unitCost: number;
  supplier?: string;
  location?: string;
  updatedAt: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
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

export const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "inv1", name: "5W-30 Full Synthetic Oil", sku: "OIL-5W30", category: "Fluids", quantity: 24, minStock: 8, unitCost: 12.5, supplier: "AutoParts Co", location: "Van 1", updatedAt: new Date().toISOString() },
  { id: "inv2", name: "Ceramic Brake Pads (Front)", sku: "BRK-CP-F", category: "Brakes", quantity: 6, minStock: 4, unitCost: 45, supplier: "BrakeMax", location: "Warehouse", updatedAt: new Date().toISOString() },
  { id: "inv3", name: "12V AGM Battery", sku: "BAT-AGM12", category: "Electrical", quantity: 3, minStock: 2, unitCost: 89, supplier: "PowerCell", location: "Van 2", updatedAt: new Date().toISOString() },
  { id: "inv4", name: "O2 Sensor (Universal)", sku: "SNS-O2-U", category: "Diagnostics", quantity: 2, minStock: 3, unitCost: 38, supplier: "SensorPro", location: "Warehouse", updatedAt: new Date().toISOString() },
];

export const DEFAULT_STAFF: StaffMember[] = [
  { id: "st1", name: "Morton Owner", email: "owner@mortonsmechanicals.com", phone: "(555) 123-4567", role: "owner", active: true, createdAt: new Date().toISOString() },
  { id: "st2", name: "Alex Rivera", email: "alex@mortonsmechanicals.com", phone: "(555) 234-5678", role: "mechanic", active: true, createdAt: new Date().toISOString() },
];

export const DEFAULT_FLEET: FleetVehicle[] = [
  { id: "fl1", name: "Mobile Unit 1", plate: "MM-1001", type: "Service Van", make: "Ford", model: "Transit", year: 2022, status: "active", mileage: 48200, lastService: "2026-06-15" },
  { id: "fl2", name: "Mobile Unit 2", plate: "MM-1002", type: "Service Van", make: "Mercedes", model: "Sprinter", year: 2021, status: "active", mileage: 61500, lastService: "2026-05-28" },
];
