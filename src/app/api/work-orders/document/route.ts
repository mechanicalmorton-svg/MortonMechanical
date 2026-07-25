import { NextResponse } from "next/server";
import { loadWorkOrders } from "@/lib/shop-data";
import type { WorkOrderDocumentKind } from "@/lib/shop-types";
import { findWorkOrderDocumentByToken } from "@/lib/work-order-document-store";

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
  let order = orders.find((item) => item.documentData?.viewToken === token);
  let fields = order?.documentData?.documents?.[kind];

  if (!fields) {
    const stored = await findWorkOrderDocumentByToken(token);
    if (stored) {
      order = orders.find((item) => item.id === stored.orderId) ?? order;
      fields = stored.documentData.documents?.[kind];
      if (!order) {
        return NextResponse.json({
          kind,
          orderId: stored.orderId,
          customerName: fields?.customer.name || "Customer",
          fields,
        });
      }
    }
  }

  if (!order || !fields) {
    return NextResponse.json(
      {
        error: !order
          ? "Document not found."
          : "That document has not been saved yet. Ask the shop to save it first.",
      },
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
