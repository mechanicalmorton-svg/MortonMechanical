import { NextResponse } from "next/server";
import { registerClientAccount, signInClient } from "@/lib/client-auth";
import { sanitizeAuthError } from "@/lib/auth-errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await registerClientAccount({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : undefined,
      password: String(body.password ?? ""),
    });

    // Immediately establish a session with the same cookie pattern as staff login.
    return signInClient({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create your account.";
    const status =
      message.toLowerCase().includes("already") || message.toLowerCase().includes("staff")
        ? 400
        : message.toLowerCase().includes("password") || message.toLowerCase().includes("email")
          ? 400
          : 500;
    return NextResponse.json({ error: sanitizeAuthError(message, message) }, { status });
  }
}
