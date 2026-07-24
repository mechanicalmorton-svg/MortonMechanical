import type { PostgrestError } from "@supabase/supabase-js";
import { sanitizeAuthError } from "../auth-errors";
import { getSupabaseAdmin, isSupabaseConfigured } from "./server";

export class DatabaseError extends Error {
  cause?: PostgrestError;

  constructor(message: string, cause?: PostgrestError) {
    super(sanitizeAuthError(message, message));
    this.name = "DatabaseError";
    this.cause = cause;
  }
}

export function isDatabaseConfigured() {
  return isSupabaseConfigured();
}

export function requireAdminClient() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new DatabaseError(
      "Database is not connected. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in your environment.",
    );
  }
  return client;
}

export function throwOnError(error: PostgrestError | null, context: string) {
  if (error) throw new DatabaseError(`${context}: ${error.message}`, error);
}

export function requireDatabaseInProduction() {
  if (!isSupabaseConfigured() && (process.env.VERCEL === "1" || process.env.NODE_ENV === "production")) {
    throw new DatabaseError(
      "Database is not connected. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in your environment.",
    );
  }
}
