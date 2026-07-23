import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { deleteQuote, loadQuotes, updateQuote } from "@/lib/quotes";

export type Quote = Awaited<ReturnType<typeof loadQuotes>>[number];

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const quotes = await loadQuotes();
  const stats = {
    total: quotes.length,
    new: quotes.filter((q) => q.status === "new").length,
    read: quotes.filter((q) => q.status === "read").length,
    archived: quotes.filter((q) => q.status === "archived").length,
  };
  return NextResponse.json({ quotes, stats });
}

export async function PATCH(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id, status } = await req.json();
  const q = await updateQuote(id, { status });
  if (!q) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  return NextResponse.json(q);
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await req.json();
  await deleteQuote(id);
  return NextResponse.json({ ok: true });
}
