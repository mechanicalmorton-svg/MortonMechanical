import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function GET(req: Request) {
  return withPermission(["bookings.create", "bookings.edit"], async () => {
    try {
      const url = new URL(req.url);
      const address = String(url.searchParams.get("address") ?? "").trim();
      if (!address) {
        return NextResponse.json({ error: "Address is required." }, { status: 400 });
      }

      const endpoint = new URL("https://nominatim.openstreetmap.org/search");
      endpoint.searchParams.set("q", address);
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("limit", "1");

      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          // Nominatim requires a valid identifying User-Agent.
          "User-Agent": "MortonsMechanicalsBooking/1.0 (admin geocode)",
        },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        return NextResponse.json({ error: "Geocoding service unavailable. Try again shortly." }, { status: 502 });
      }

      const data = (await res.json()) as NominatimResult[];
      const hit = data[0];
      const lat = hit?.lat != null ? Number(hit.lat) : NaN;
      const lng = hit?.lon != null ? Number(hit.lon) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json(
          { error: "No coordinates found for that address. Add more detail (city/ZIP) or enter lat/lng." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        lat,
        lng,
        label: hit.display_name ?? address,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not geocode address." },
        { status: 400 },
      );
    }
  });
}
