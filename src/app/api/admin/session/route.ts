import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/admin-api";
import { isSetupComplete } from "@/lib/auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAuthUser();
  return NextResponse.json({
    setupComplete: isSupabaseAuthConfigured() ? true : await isSetupComplete(),
    user,
  });
}
