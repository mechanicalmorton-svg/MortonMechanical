import type { CustomerVehicle } from "./shop-types";

export type ParsedWorkOrderVehicle = {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  plate?: string;
};

const VIN_TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Normalize VIN: uppercase, strip spaces/dashes. */
export function normalizeVin(value: string | undefined | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, "");
}

/** Normalize license plate: uppercase, collapse spaces. */
export function normalizePlate(value: string | undefined | null) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ISO 3779 VIN check (17 chars, no I/O/Q, valid check digit).
 * Returns null when valid, otherwise a short reason.
 */
export function vinValidationError(value: string | undefined | null): string | null {
  const vin = normalizeVin(value);
  if (!vin) return "VIN is required.";
  if (vin.length !== 17) return "VIN must be exactly 17 characters.";
  if (/[IOQ]/.test(vin)) return "VIN cannot contain I, O, or Q.";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return "VIN has invalid characters.";

  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const ch = vin[i]!;
    const n = /\d/.test(ch) ? Number(ch) : VIN_TRANSLITERATION[ch];
    if (n == null) return "VIN has invalid characters.";
    sum += n * VIN_WEIGHTS[i]!;
  }
  const remainder = sum % 11;
  const check = remainder === 10 ? "X" : String(remainder);
  if (vin[8] !== check) return "VIN check digit is invalid.";
  return null;
}

export function isValidVin(value: string | undefined | null) {
  return vinValidationError(value) == null;
}

export function plateValidationError(value: string | undefined | null): string | null {
  const plate = normalizePlate(value);
  if (!plate) return "License Plate is required.";
  if (plate.length < 2) return "License Plate looks too short.";
  if (plate.length > 16) return "License Plate looks too long.";
  return null;
}

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
