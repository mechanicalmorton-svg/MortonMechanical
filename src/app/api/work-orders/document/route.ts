import { NextResponse } from "next/server";
import { loadWorkOrders } from "@/lib/shop-data";
import type { WorkOrderDocumentKind } from "@/lib/shop-types";

function parseKind(value: string | null): WorkOrderDocumentKind {
  if (value === "estimate" || value === "invoice" || value === "work-order") return value;
  return "work-order";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() || "";
  const kind = parseKind(url.searchParams.get("kind"));

  if (!token) {
    return NextResponse.json({ error: "Missing view token." }, { status: 400 });
  }

  const orders = await loadWorkOrders();
  const order = orders.find((item) => item.documentData?.viewToken === token);
  if (!order) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const fields = order.documentData?.documents?.[kind];
  if (!fields) {
    return NextResponse.json(
      { error: "That document has not been saved yet. Ask the shop to save it first." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    kind,
    orderId: order.id,
    customerName: order.customerName,
    fields,
  });
}
