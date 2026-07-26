import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { deleteQuote, loadQuotes, updateQuote } from "@/lib/quotes";

export async function GET() {
  return withPermission("quotes.view", async () => {
    const quotes = await loadQuotes();
    return NextResponse.json({ quotes });
  });
}

export async function PATCH(req: Request) {
  return withPermission("quotes.edit", async () => {
    const { id, status } = await req.json();
    const q = await updateQuote(id, { status });
    if (!q) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    return NextResponse.json(q);
  });
}

export async function DELETE(req: Request) {
  return withPermission("quotes.delete", async () => {
    const { id } = await req.json();
    await deleteQuote(id);
    return NextResponse.json({ ok: true });
  });
}
