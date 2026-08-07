"use client";

import { useEffect, useState } from "react";
import { SITE_CONTENT_BROADCAST } from "./site-content-live";
import { SHOP_CONTACT, type ShopContact } from "./work-order-documents";

/** Keeps the last loaded letterhead so reopening a document does not flash defaults. */
let cachedContact: ShopContact | null = null;

/** Business info from Site Contents, used for document letterheads. */
export function useShopContact(): ShopContact {
  const [contact, setContact] = useState<ShopContact>(cachedContact ?? SHOP_CONTACT);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/site-contact", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<ShopContact>;
        // Merge over defaults so an older payload without every field cannot break callers.
        const next: ShopContact = {
          ...SHOP_CONTACT,
          ...data,
          logos: { ...SHOP_CONTACT.logos, ...(data.logos ?? {}) },
          logoScales: { ...SHOP_CONTACT.logoScales, ...(data.logoScales ?? {}) },
        };
        cachedContact = next;
        if (!cancelled) setContact(next);
      } catch {
        /* keep the current letterhead */
      }
    }

    load();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SITE_CONTENT_BROADCAST);
      channel.onmessage = () => load();
    } catch {
      /* BroadcastChannel unavailable */
    }

    return () => {
      cancelled = true;
      channel?.close();
    };
  }, []);

  return contact;
}
