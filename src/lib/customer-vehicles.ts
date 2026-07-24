import type { CustomerVehicle } from "./shop-types";

export type ParsedWorkOrderVehicle = {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  plate?: string;
};

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

/** Best-effort parse of the work order `vehicle` text field back into form values. */
export function parseWorkOrderVehicleLabel(label: string): ParsedWorkOrderVehicle {
  const trimmed = label.trim();
  if (!trimmed) return {};

  let plate = "";
  let base = trimmed;
  const plateSplit = trimmed.split(/\s—\s*Plate:\s*/i);
  if (plateSplit.length > 1) {
    base = plateSplit[0]?.trim() ?? "";
    plate = plateSplit[1]?.trim() ?? "";
  }

  if (/^Plate:\s*/i.test(base) && !plate) {
    plate = base.replace(/^Plate:\s*/i, "").trim();
    return plate ? { plate } : {};
  }

  const yearMatch = base.match(/^(\d{4})\s+([\s\S]+)$/);
  if (!yearMatch) {
    const tokens = base.split(/\s+/).filter(Boolean);
    if (!tokens.length) return plate ? { plate } : {};
    return {
      make: tokens[0],
      model: tokens.slice(1).join(" ") || undefined,
      plate: plate || undefined,
    };
  }

  const year = Number(yearMatch[1]);
  const remainder = yearMatch[2]?.trim() ?? "";
  const tokens = remainder.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return { year, plate: plate || undefined };
  }

  return {
    year,
    make: tokens[0],
    model: tokens.slice(1).join(" ") || undefined,
    plate: plate || undefined,
  };
}
