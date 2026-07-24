import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";

const modelCache = new Map<string, { models: string[]; at: number }>();
const TTL_MS = 60 * 60 * 1000;

export async function GET(req: Request) {
  return withAdminAuth(async () => {
    const make = new URL(req.url).searchParams.get("make")?.trim();
    const year = new URL(req.url).searchParams.get("year")?.trim();
    if (!make) return NextResponse.json({ error: "Make is required." }, { status: 400 });

    const cacheKey = `${make.toLowerCase()}|${year ?? ""}`;
    const cached = modelCache.get(cacheKey);
    if (cached && Date.now() - cached.at < TTL_MS) {
      return NextResponse.json(cached.models);
    }

    const encodedMake = encodeURIComponent(make);
    const url = year
      ? `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodedMake}/modelyear/${encodeURIComponent(year)}?format=json`
      : `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodedMake}?format=json`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({ error: "Could not load models for that make." }, { status: 502 });

    const data = (await res.json()) as { Results?: { Model_Name: string }[] };
    const models = [...new Set((data.Results ?? []).map((r) => r.Model_Name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    modelCache.set(cacheKey, { models, at: Date.now() });
    return NextResponse.json(models);
  });
}
