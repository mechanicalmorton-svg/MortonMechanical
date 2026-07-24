import type { FleetVehicle, InventoryItem } from "./shop-types";

export function formatFleetVehicle(vehicle: FleetVehicle) {
  return `${vehicle.name} · ${vehicle.plate}`;
}

export function formatFleetVehicleOption(vehicle: FleetVehicle) {
  const details = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const suffix = details || vehicle.type;
  return `${formatFleetVehicle(vehicle)} (${suffix})`;
}

export function resolveInventoryVehicle(item: InventoryItem, fleet: FleetVehicle[]) {
  if (item.vehicleId) {
    const vehicle = fleet.find((v) => v.id === item.vehicleId);
    if (vehicle) return formatFleetVehicle(vehicle);
    return "Unknown vehicle";
  }
  return item.location?.trim() || "—";
}

export function vehicleLocationLabel(vehicleId: string, fleet: FleetVehicle[]) {
  const vehicle = fleet.find((v) => v.id === vehicleId);
  return vehicle ? formatFleetVehicle(vehicle) : "";
}

export function sortFleetForSelect(fleet: FleetVehicle[]) {
  const rank: Record<FleetVehicle["status"], number> = {
    active: 0,
    maintenance: 1,
    retired: 2,
  };
  return [...fleet].sort((a, b) => {
    const statusDiff = rank[a.status] - rank[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}
