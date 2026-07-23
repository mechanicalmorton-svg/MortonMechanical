import { NextResponse } from "next/server";
import { getContent } from "@/lib/content";
import { addQuote } from "@/lib/quotes";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content = await getContent();

    if (!body.name?.trim()) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!body.phone?.trim()) return NextResponse.json({ error: "Please enter your phone." }, { status: 400 });
    if (!body.consent) return NextResponse.json({ error: "Consent is required." }, { status: 400 });

    await addQuote({
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: body.email ? String(body.email).trim() : "",
      rego: body.rego ? String(body.rego).trim() : "",
      service: body.service || content.serviceOptions[0],
      contactMethod: body.contactMethod || "phone",
      message: body.message ? String(body.message).trim() : "",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save your request." }, { status: 500 });
  }
}
