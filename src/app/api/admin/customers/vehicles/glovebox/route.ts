import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  deleteVehicleGloveboxDoc,
  loadVehicleGlovebox,
  uploadVehicleGloveboxDoc,
} from "@/lib/vehicle-glovebox";

export async function GET(req: Request) {
  return withPermission("customers.view", async () => {
    try {
      const vehicleId = new URL(req.url).searchParams.get("customerVehicleId")?.trim() || "";
      if (!vehicleId) {
        return NextResponse.json({ error: "customerVehicleId is required." }, { status: 400 });
      }
      return NextResponse.json(await loadVehicleGlovebox(vehicleId));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not load glovebox." },
        { status: 400 },
      );
    }
  });
}

export async function POST(req: Request) {
  return withPermission("customers.edit", async () => {
    try {
      const form = await req.formData();
      const customerVehicleId = String(form.get("customerVehicleId") ?? "").trim();
      const file = form.get("file");
      if (!customerVehicleId) {
        return NextResponse.json({ error: "customerVehicleId is required." }, { status: 400 });
      }
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
      }

      const doc = await uploadVehicleGloveboxDoc({
        customerVehicleId,
        kind: form.get("kind"),
        label: typeof form.get("label") === "string" ? String(form.get("label")) : undefined,
        expiresOn: typeof form.get("expiresOn") === "string" ? String(form.get("expiresOn")) : undefined,
        file,
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
      });
      return NextResponse.json(doc);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not upload document." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("customers.edit", async () => {
    try {
      const body = await req.json();
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      await deleteVehicleGloveboxDoc(id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete document." },
        { status: 400 },
      );
    }
  });
}
