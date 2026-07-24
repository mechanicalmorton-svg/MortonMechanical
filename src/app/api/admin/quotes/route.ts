import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { deleteQuote, loadQuotes, updateQuote } from "@/lib/quotes";

export async function GET() {
  return withAdminAuth(async () => {
    const quotes = await loadQuotes();
    return NextResponse.json({ quotes });
  });
}

export async function PATCH(req: Request) {
  return withAdminAuth(async () => {
    const { id, status } = await req.json();
    const q = await updateQuote(id, { status });
    if (!q) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    return NextResponse.json(q);
  });
}

export async function DELETE(req: Request) {
  return withAdminAuth(async () => {
    const { id } = await req.json();
    await deleteQuote(id);
    return NextResponse.json({ ok: true });
  });
}
