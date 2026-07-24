import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";

const modelCache = new Map<string, { models: string[]; at: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

async function fetchModels(url: string) {
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return [] as string[];
  const data = (await res.json()) as { Results?: { Model_Name?: string; ModelName?: string }[] };
  return [...new Set((data.Results ?? []).map((r) => (r.Model_Name ?? r.ModelName ?? "").trim()).filter(Boolean))];
}

export async function GET(req: Request) {
  return withAdminAuth(async () => {
    const params = new URL(req.url).searchParams;
    const make = params.get("make")?.trim();
    const makeId = params.get("makeId")?.trim();
    const year = params.get("year")?.trim();

    if (!make && !makeId) {
      return NextResponse.json({ error: "Make or makeId is required." }, { status: 400 });
    }

    const cacheKey = `${makeId ?? ""}|${make?.toLowerCase() ?? ""}|${year ?? ""}`;
    const cached = modelCache.get(cacheKey);
    if (cached && Date.now() - cached.at < TTL_MS) {
      return NextResponse.json(cached.models);
    }

    const urls: string[] = [];

    if (makeId) {
      if (year) {
        urls.push(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/${encodeURIComponent(makeId)}/modelyear/${encodeURIComponent(year)}?format=json`,
        );
      }
      urls.push(
        `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${encodeURIComponent(makeId)}?format=json`,
      );
    }

    if (make) {
      const encodedMake = encodeURIComponent(make);
      if (year) {
        urls.push(
          `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodedMake}/modelyear/${encodeURIComponent(year)}?format=json`,
        );
      }
      urls.push(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodedMake}?format=json`);
    }

    const merged = new Set<string>();
    for (const url of urls) {
      for (const model of await fetchModels(url)) merged.add(model);
      if (merged.size > 0 && !year) break;
    }

    const models = [...merged].sort((a, b) => a.localeCompare(b));
    modelCache.set(cacheKey, { models, at: Date.now() });
    return NextResponse.json(models);
  });
}
