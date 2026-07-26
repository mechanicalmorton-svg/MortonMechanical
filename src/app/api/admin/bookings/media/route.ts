import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { removeBookingPhoto, uploadBookingPhoto } from "@/lib/booking-media";

export async function POST(req: Request) {
  return withPermission("bookings.edit", async () => {
    try {
      const form = await req.formData();
      const bookingId = String(form.get("bookingId") ?? "").trim();
      const file = form.get("file");
      if (!bookingId) {
        return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
      }
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
      }

      const result = await uploadBookingPhoto(bookingId, file, file.type || "image/jpeg");
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not upload photo." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("bookings.edit", async () => {
    try {
      const body = await req.json();
      const bookingId = String(body.bookingId ?? "").trim();
      const photoUrl = String(body.photoUrl ?? "").trim();
      if (!bookingId || !photoUrl) {
        return NextResponse.json({ error: "bookingId and photoUrl are required." }, { status: 400 });
      }
      const booking = await removeBookingPhoto(bookingId, photoUrl);
      return NextResponse.json(booking);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not remove photo." },
        { status: 400 },
      );
    }
  });
}
