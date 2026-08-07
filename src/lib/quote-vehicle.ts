export type QuoteVehicle = {
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
};

/** "2018 Toyota Corolla" from whichever vehicle parts the customer filled in. */
export function vehicleLabel(vehicle: QuoteVehicle) {
  return [vehicle.vehicleYear, vehicle.vehicleMake, vehicle.vehicleModel]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}
