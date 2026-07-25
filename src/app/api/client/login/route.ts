import { signInClient, signOutClient } from "@/lib/client-auth";

export async function POST(req: Request) {
  const body = await req.json();
  return signInClient({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });
}

export async function DELETE() {
  return signOutClient();
}
