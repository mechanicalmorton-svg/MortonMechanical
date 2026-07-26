/** Shared vehicle year options for admin forms (newest first). */
export const VEHICLE_YEAR_MIN = 1855;

export function vehicleYearOptions(now = new Date().getFullYear()): string[] {
  const latest = Math.max(now, VEHICLE_YEAR_MIN);
  const length = latest - VEHICLE_YEAR_MIN + 1;
  return Array.from({ length }, (_, i) => String(latest - i));
}
