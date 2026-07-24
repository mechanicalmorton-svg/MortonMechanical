import { NextResponse } from "next/server";
import { requireAuth, requireOwnerOrAdmin, type AuthUser } from "./admin-api";
import { DatabaseError, isDatabaseConfigured } from "./supabase/db";

function errorResponse(err: unknown) {
  if (err instanceof DatabaseError) {
    const status = err.message.toLowerCase().includes("not connected") ? 503 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: 500 });
}

function databaseGuard() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not connected. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }
  return null;
}

export async function withAdminAuth(handler: (user: AuthUser) => Promise<NextResponse>) {
  const { user, error } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const dbError = databaseGuard();
  if (dbError) return dbError;
  try {
    return await handler(user);
  } catch (err) {
    console.error("[admin-api]", err);
    return errorResponse(err);
  }
}

export async function withOwnerAdmin(handler: (user: AuthUser) => Promise<NextResponse>) {
  const { user, error } = await requireOwnerOrAdmin();
  if (error || !user) return error ?? NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const dbError = databaseGuard();
  if (dbError) return dbError;
  try {
    return await handler(user);
  } catch (err) {
    console.error("[admin-api]", err);
    return errorResponse(err);
  }
}
