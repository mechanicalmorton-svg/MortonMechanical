import { NextResponse } from "next/server";
import { getContent } from "@/lib/content";
import { logoScaleSet, logoSet } from "@/lib/content-types";
import { SHOP_CONTACT, type ShopContact } from "@/lib/work-order-documents";

/** Letterhead info for documents, driven by Site Contents business info. */
export async function GET() {
  try {
    const { site, images } = await getContent();
    const contact: ShopContact = {
      businessName: site.name?.trim() || SHOP_CONTACT.businessName,
      phone: site.phone?.trim() || SHOP_CONTACT.phone,
      email: site.email?.trim() || SHOP_CONTACT.email,
      address: site.address?.trim() || SHOP_CONTACT.address,
      logoUrl: images.logo?.trim() || SHOP_CONTACT.logoUrl,
      logos: logoSet(images),
      logoScales: logoScaleSet(images),
      slogan: SHOP_CONTACT.slogan,
      sloganAccent: SHOP_CONTACT.sloganAccent,
      thankYou: SHOP_CONTACT.thankYou,
    };
    return NextResponse.json(contact, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(SHOP_CONTACT, { headers: { "Cache-Control": "no-store" } });
  }
}
