import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { isFounder } from "@/lib/permissions/service";
import { loadInventory, loadWorkOrders, upsertInventoryItem, upsertWorkOrder } from "@/lib/shop-data";
import { verifyEmailPassword } from "@/lib/staff-auth";
import { PART_ROW_COUNT, resolveDocumentFields } from "@/lib/work-order-documents";
import type { WorkOrderPartLine } from "@/lib/shop-types";

function emptyPartLine(): WorkOrderPartLine {
  return { qty: null, description: "", partNumber: "", unitPrice: null, inventoryId: undefined };
}

function passwordsMatch(provided: string, expected: string) {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

async function verifyFounderPartsPassword(
  user: { email?: string | null },
  password: string,
): Promise<boolean> {
  const override = process.env.FOUNDER_PARTS_REMOVE_PASSWORD?.trim();
  if (override) return passwordsMatch(password, override);

  const email = user.email?.trim();
  if (!email || !password) return false;
  const result = await verifyEmailPassword(email, password);
  return Boolean(result);
}

export async function POST(req: Request) {
  return withPermission("work_orders.edit", async (user) => {
    if (!isFounder(user)) {
      return NextResponse.json(
        { error: "Only a Founder can remove parts from a work order." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const workOrderId = typeof body.workOrderId === "string" ? body.workOrderId.trim() : "";
    const partIndex = Number(body.partIndex);
    const password = typeof body.password === "string" ? body.password : "";

    if (!workOrderId) {
      return NextResponse.json({ error: "Work order id is required." }, { status: 400 });
    }
    if (!Number.isInteger(partIndex) || partIndex < 0 || partIndex >= PART_ROW_COUNT) {
      return NextResponse.json({ error: "Invalid part line." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const ok = await verifyFounderPartsPassword(user, password);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
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
