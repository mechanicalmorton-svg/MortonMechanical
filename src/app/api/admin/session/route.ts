import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getSessionUser, isSetupComplete } from "@/lib/auth";

export async function GET() {
  const jar = await cookies();
  const user = await getSessionUser(jar.get(AUTH_COOKIE)?.value);
  return NextResponse.json({ setupComplete: await isSetupComplete(), user });
}
