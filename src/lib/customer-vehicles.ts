import type { CustomerVehicle } from "./shop-types";

export function formatCustomerVehicleLabel(vehicle: Pick<CustomerVehicle, "year" | "make" | "model" | "trim" | "plate">) {
  const parts = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean);
  const base = parts.join(" ").trim();
  if (vehicle.plate?.trim()) {
    return base ? `${base} — Plate: ${vehicle.plate.trim()}` : `Plate: ${vehicle.plate.trim()}`;
  }
  return base || "Vehicle on file";
}

export function formatCustomerVehicleOption(vehicle: CustomerVehicle) {
  return formatCustomerVehicleLabel(vehicle);
}
