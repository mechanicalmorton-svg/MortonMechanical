import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";

let cache: { makes: string[]; at: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  return withAdminAuth(async () => {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return NextResponse.json(cache.makes);
    }

    const res = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ error: "Could not load vehicle makes." }, { status: 502 });

    const data = (await res.json()) as { Results?: { Make_Name: string }[] };
    const makes = [...new Set((data.Results ?? []).map((r) => r.Make_Name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    cache = { makes, at: Date.now() };
    return NextResponse.json(makes);
  });
}
