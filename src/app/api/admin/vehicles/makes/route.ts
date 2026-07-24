import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { loadCatalogMakes } from "@/lib/vehicle-catalog";

export type VehicleMakeOption = { id: number; name: string };

let cache: { makes: VehicleMakeOption[]; at: number } | null = null;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchMakesForType(type: string) {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/${encodeURIComponent(type)}?format=json`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return [] as VehicleMakeOption[];
  const data = (await res.json()) as { Results?: { MakeId: number; MakeName: string }[] };
  return (data.Results ?? [])
    .filter((r) => r.MakeId && r.MakeName)
    .map((r) => ({ id: r.MakeId, name: r.MakeName.trim() }));
}

export async function GET() {
  return withAdminAuth(async () => {
    const catalogMakes = await loadCatalogMakes();
    if (catalogMakes.length) {
      return NextResponse.json(catalogMakes);
    }

    if (cache && Date.now() - cache.at < TTL_MS) {
      return NextResponse.json(cache.makes);
    }

    const [allMakesRes, ...typedMakes] = await Promise.all([
      fetch("https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json", { next: { revalidate: 86400 } }),
      fetchMakesForType("car"),
      fetchMakesForType("truck"),
      fetchMakesForType("multipurpose passenger vehicle (mpv)"),
      fetchMakesForType("motorcycle"),
    ]);

    const byId = new Map<number, string>();

    if (allMakesRes.ok) {
      const data = (await allMakesRes.json()) as { Results?: { Make_ID: number; Make_Name: string }[] };
      for (const row of data.Results ?? []) {
        if (row.Make_ID && row.Make_Name) byId.set(row.Make_ID, row.Make_Name.trim());
      }
    }

    for (const group of typedMakes) {
      for (const make of group) {
        byId.set(make.id, make.name);
      }
    }

    const makes = [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache = { makes, at: Date.now() };
    return NextResponse.json(makes);
  });
}
