import { deleteFleetVehicle, loadFleet, upsertFleetVehicle } from "./shop-data";
import type { FleetStatus, FleetVehicle, VmVehicle, VmVehicleStatus } from "./shop-types";
import { deleteVmVehicle, loadVmVehicles, upsertVmVehicle } from "./vehicle-manager-data";

function fleetStatusToVm(status: FleetStatus): VmVehicleStatus {
  if (status === "retired") return "out_of_service";
  if (status === "maintenance") return "maintenance";
  return "active";
}

function vmStatusToFleet(status: VmVehicleStatus): FleetStatus {
  if (status === "out_of_service") return "retired";
  if (status === "maintenance") return "maintenance";
  return "active";
}

export function fleetVehicleToVm(fleet: FleetVehicle): VmVehicle {
  return {
    id: fleet.id,
    name: fleet.name,
    vehicleNumber: fleet.plate || "",
    year: fleet.year || 0,
    make: fleet.make || "",
    model: fleet.model || "",
    status: fleetStatusToVm(fleet.status),
    mileage: fleet.mileage,
    lastService: fleet.lastService,
  };
}

export function vmVehicleToFleet(vm: VmVehicle, existing?: FleetVehicle | null): FleetVehicle {
  return {
    id: vm.id,
    name: vm.name || existing?.name || "Vehicle",
    plate: vm.vehicleNumber || existing?.plate || "",
    type: existing?.type || "Service Van",
    make: vm.make || existing?.make,
    model: vm.model || existing?.model,
    year: vm.year || existing?.year,
    status: vmStatusToFleet(vm.status),
    mileage: vm.mileage ?? existing?.mileage,
    lastService: vm.lastService ?? existing?.lastService,
  };
}

/** Mirror a fleet vehicle into Vehicle Manager (same id). */
export async function syncFleetVehicleToVm(fleet: FleetVehicle) {
  try {
    await upsertVmVehicle(fleetVehicleToVm(fleet));
  } catch (err) {
    console.error("[fleet-vm-sync] fleet → VM failed", fleet.id, err);
  }
}

/** Mirror a VM vehicle into Fleet (same id). Preserves fleet-only fields like type. */
export async function syncVmVehicleToFleet(vm: VmVehicle) {
  try {
    const existing = (await loadFleet()).find((v) => v.id === vm.id) ?? null;
    await upsertFleetVehicle(vmVehicleToFleet(vm, existing));
  } catch (err) {
    console.error("[fleet-vm-sync] VM → fleet failed", vm.id, err);
  }
}

export async function syncDeleteFleetVehicle(id: string) {
  try {
    await deleteVmVehicle(id);
  } catch (err) {
    console.error("[fleet-vm-sync] fleet delete → VM failed", id, err);
  }
}

export async function syncDeleteVmVehicle(id: string) {
  try {
    await deleteFleetVehicle(id);
  } catch (err) {
    console.error("[fleet-vm-sync] VM delete → fleet failed", id, err);
  }
}

/**
 * Ensure every fleet vehicle has a Vehicle Manager row (backfill for existing data).
 * Does not overwrite vehicles that already exist in VM.
 */
export async function ensureVmMirrorsFromFleet() {
  const [fleet, vm] = await Promise.all([loadFleet(), loadVmVehicles()]);
  const existing = new Set(vm.map((v) => v.id));
  for (const vehicle of fleet) {
    if (existing.has(vehicle.id)) continue;
    try {
      await upsertVmVehicle(fleetVehicleToVm(vehicle));
    } catch (err) {
      console.error("[fleet-vm-sync] failed to mirror fleet vehicle", vehicle.id, err);
    }
  }
}
