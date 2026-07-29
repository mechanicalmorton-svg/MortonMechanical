export type WorkOrderStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "waiting_on_parts"
  | "waiting_customer"
  | "completed"
  | "delivered"
  | "cancelled";
export type Priority = "normal" | "urgent";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type BookingLocationType = "home" | "work" | "business" | "apartment" | "roadside" | "other";
export type PaymentStatus = "unpaid" | "paid" | "deposit_paid";

export type ShopServiceFaq = { question: string; answer: string };
export type ShopServicePartRef = { inventoryId?: string; name: string; quantity?: number };
export type ShopServiceAddon = { name: string; price?: number; description?: string };

/** Operational service catalog item (shop_services). */
export type ShopService = {
  id: string;
  name: string;
  category: string;
  description?: string;
  estimatedDurationMinutes: number;
  laborHours: number;
  startingPrice: number;
  photoUrl?: string;
  warranty?: string;
  faqs: ShopServiceFaq[];
  requiredParts: ShopServicePartRef[];
  optionalAddons: ShopServiceAddon[];
  maintenanceIntervalMiles?: number;
  maintenanceIntervalMonths?: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const SHOP_SERVICE_CATEGORIES = [
  "Oil Changes",
  "Brake Repairs",
  "Diagnostics",
  "AC Repair",
  "Suspension",
  "Steering",
  "Tires",
  "Roadside Assistance",
  "Mobile Diagnostics",
  "Custom Repairs",
] as const;
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

/** Digital glovebox doc on a customer vehicle (registration, insurance, etc.). */
export type VehicleGloveboxKind = "registration" | "insurance" | "inspection" | "other";

export type VehicleGloveboxDoc = {
  id: string;
  customerVehicleId: string;
  kind: VehicleGloveboxKind;
  label: string;
  fileUrl: string;
  fileName: string;
  contentType: string;
  expiresOn?: string;
  createdAt: string;
};

export const VEHICLE_GLOVEBOX_KINDS: { id: VehicleGloveboxKind; label: string }[] = [
  { id: "registration", label: "Registration" },
  { id: "insurance", label: "Insurance" },
  { id: "inspection", label: "Inspection" },
  { id: "other", label: "Other" },
];

/** Maintenance / service log entry on a customer vehicle. */
export type VehicleServiceHistoryEntry = {
  id: string;
  customerVehicleId: string;
  performedOn: string;
  mileage?: number;
  category: string;
  summary: string;
  description?: string;
  workOrderId?: string;
  bookingId?: string;
  createdAt: string;
};

export const VEHICLE_SERVICE_CATEGORIES = [
  "Oil Change",
  "Brakes",
  "Tires",
  "Inspection",
  "Diagnostics",
  "AC / Heating",
  "Suspension",
  "Electrical",
  "Service",
  "Other",
] as const;

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
  /** Inventory item id when pulled from stock — used to restock on remove. */
  inventoryId?: string;
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
  /** Shop notes / story corrections shown on the work order detail. */
  storyCorrections?: string;
  documents?: Partial<Record<WorkOrderDocumentKind, WorkOrderDocumentFields>>;
};

export type WorkOrder = {
  id: string;
  customerId?: string;
  customerVehicleId?: string;
  bookingId?: string;
  serviceId?: string;
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
  customerVehicleId?: string;
  workOrderId?: string;
  serviceId?: string;
  assignedTo?: string;
  customerName: string;
  phone: string;
  email?: string;
  service: string;
  date: string;
  time: string;
  address?: string;
  locationType?: BookingLocationType;
  /** Gate / door / entry code for mobile jobs. */
  gateCode?: string;
  /** Parking, pets, building access, etc. */
  accessNotes?: string;
  /** Optional GPS pin for the job site. */
  lat?: number;
  lng?: number;
  /** Public Supabase storage URLs for site photos. */
  photoUrls?: string[];
  problemDescription?: string;
  durationMinutes?: number;
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

/** Vehicle Manager (shop PM / checklist app) — separate from Fleet Management. */
export type VmVehicleStatus = "active" | "maintenance" | "out_of_service";

export type VmVehicle = {
  id: string;
  name: string;
  vehicleNumber: string;
  year: number;
  make: string;
  model: string;
  status: VmVehicleStatus;
  mileage?: number;
  lastService?: string;
};

export type VmPart = {
  id: string;
  name: string;
  partNumber: string;
  description: string;
};

export type VmActivity = {
  id: string;
  name: string;
};

export type VmServiceOrderPart = {
  id: string;
  partId: string;
  quantity: number;
};

export type VmServiceOrder = {
  id: string;
  vehicleId: string;
  mileage: string;
  workNeeded: string;
  dvir: string;
  description: string;
  hours: number;
  activityId?: string;
  parts: VmServiceOrderPart[];
  createdAt: string;
  createdBy?: string;
  createdByUserId?: string;
};

export type VmChecklistItem = {
  id: string;
  vehicleId: string;
  sortOrder: number;
  isDone: boolean;
};

export type VmChecklist = {
  id: string;
  name: string;
  createdAt: string;
  items: VmChecklistItem[];
};

export type RouteStop = {
  id: string;
  customerName: string;
  address: string;
  time: string;
  service: string;
  completed: boolean;
  /** Optional links when stop was created from booking orchestration. */
  bookingId?: string;
  workOrderId?: string;
  customerId?: string;
  customerVehicleId?: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

export type RoutePlan = {
  id: string;
  date: string;
  driverId?: string;
  vehicleId?: string;
  stops: RouteStop[];
  status: RouteStatus;
  notes?: string;
  /** Odometer reading entered for this route day (syncs to fleet + Vehicle Manager). */
  mileage?: number;
};

export type TimeEntry = {
  id: string;
  staffId: string;
  clockInAt: string;
  clockOutAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  editedBy?: string;
  editedAt?: string;
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
