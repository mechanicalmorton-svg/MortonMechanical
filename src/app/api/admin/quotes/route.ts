import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { deleteQuote, loadQuotes, updateQuote } from "@/lib/quotes";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const quotes = await loadQuotes();
  return NextResponse.json({ quotes });
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
