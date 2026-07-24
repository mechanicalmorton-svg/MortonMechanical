import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { updatePassword } from "@/lib/auth";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;
  const { password } = await req.json();
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    if (isSupabaseAuthConfigured()) {
      const supabase = await createAuthServerClient();
      if (!supabase) throw new Error("Auth is not configured.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ ok: true });
    }

    await updatePassword(user.id, password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
