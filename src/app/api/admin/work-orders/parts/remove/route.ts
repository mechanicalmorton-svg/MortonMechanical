import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { loadInventory, loadWorkOrders, upsertInventoryItem, upsertWorkOrder } from "@/lib/shop-data";
import { PART_ROW_COUNT, resolveDocumentFields } from "@/lib/work-order-documents";
import type { WorkOrderPartLine } from "@/lib/shop-types";

function emptyPartLine(): WorkOrderPartLine {
  return { qty: null, description: "", partNumber: "", unitPrice: null, inventoryId: undefined };
}

export async function POST(req: Request) {
  return withPermission("work_orders.parts.remove", async () => {
    const body = await req.json();
    const workOrderId = typeof body.workOrderId === "string" ? body.workOrderId.trim() : "";
    const partIndex = Number(body.partIndex);

    if (!workOrderId) {
      return NextResponse.json({ error: "Work order id is required." }, { status: 400 });
    }
    if (!Number.isInteger(partIndex) || partIndex < 0 || partIndex >= PART_ROW_COUNT) {
      return NextResponse.json({ error: "Invalid part line." }, { status: 400 });
    }

    const items = await loadWorkOrders();
    const order = items.find((row) => row.id === workOrderId);
    if (!order) return NextResponse.json({ error: "Work order not found." }, { status: 404 });

    const fields = resolveDocumentFields(order, "work-order");
    const parts = fields.parts.map((line) => ({ ...line }));
    const removed = parts[partIndex];
    if (!removed || !(removed.description?.trim() || removed.partNumber?.trim() || (removed.qty ?? 0) > 0)) {
      return NextResponse.json({ error: "That part line is already empty." }, { status: 400 });
    }

    const restockQty = Number(removed.qty) || 0;
    const inventoryId = removed.inventoryId?.trim();

    parts[partIndex] = emptyPartLine();

    const documentData = {
      ...(order.documentData ?? {}),
      documents: {
        ...(order.documentData?.documents ?? {}),
        "work-order": {
          ...fields,
          parts,
        },
      },
    };

    const updated = {
      ...order,
      documentData,
      updatedAt: new Date().toISOString(),
    };
    await upsertWorkOrder(updated);

    if (inventoryId && restockQty > 0) {
      const inventory = await loadInventory();
      const stock = inventory.find((row) => row.id === inventoryId);
      if (stock) {
        await upsertInventoryItem({
          ...stock,
          quantity: stock.quantity + restockQty,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json(updated);
  });
}
