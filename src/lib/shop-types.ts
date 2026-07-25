export type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";
export type Priority = "normal" | "urgent";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "deposit_paid";
/** Built-in role ids plus any custom role ids created in User Management. */
export type StaffRole = string;
export type BuiltInStaffRole = "owner" | "mechanic" | "dispatcher" | "admin";
export type FleetStatus = "active" | "maintenance" | "retired";
export type RouteStatus = "planned" | "in_progress" | "completed";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  /** Supabase Auth user id when this customer has a client portal account. */
  authUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerVehicle = {
  id: string;
  customerId: string;
  vehicleConfigurationId?: number;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  plate?: string;
  powertrain?: string;
  mileage?: number;
  color?: string;
  notes?: string;
  createdAt: string;
};

export type WorkOrderDocumentKind = "work-order" | "estimate" | "invoice";

export type WorkOrderServiceLine = {
  description: string;
  estLabor: number | null;
};

export type WorkOrderPartLine = {
  qty: number | null;
  description: string;
  partNumber: string;
  unitPrice: number | null;
};

export type WorkOrderDocumentFields = {
  workOrderNumber: string;
  date: string;
  promisedDate: string;
  advisor: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  vehicle: {
    make: string;
    year: string;
    plate: string;
    color: string;
    model: string;
    vin: string;
    mileage: string;
    engine: string;
  };
  services: WorkOrderServiceLine[];
  technicianNotes: string;
  parts: WorkOrderPartLine[];
  workDescription: string;
  authorization: {
    customerSignature: string;
    date: string;
    textEmailUpdates: boolean;
    paymentSignature: string;
    paymentDate: string;
  };
  summary: {
    taxPercent: number;
    excise: number;
  };
  notes: string;
};

export type WorkOrderDocumentData = {
  viewToken?: string;
  documents?: Partial<Record<WorkOrderDocumentKind, WorkOrderDocumentFields>>;
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
  paymentStatus?: PaymentStatus;
  stripeCheckoutSessionId?: string;
  scheduledDate?: string;
  documentData?: WorkOrderDocumentData;
  createdAt: string;
  updatedAt: string;
};

export type Booking = {
  id: string;
  customerId?: string;
  quoteId?: string;
  customerName: string;
  phone: string;
  email?: string;
  service: string;
  date: string;
  time: string;
  address?: string;
  status: BookingStatus;
  notes?: string;
  depositPaid?: boolean;
  stripeCheckoutSessionId?: string;
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
  /** Primary / legacy single role (first or highest-priority of roleIds). */
  role: StaffRole;
  /** All assigned role ids. Prefer this over `role` when reading. */
  roleIds: StaffRole[];
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
