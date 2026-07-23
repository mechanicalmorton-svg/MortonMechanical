"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

/** Subscribes to Supabase realtime content changes and refreshes the page live. */
export function ContentLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb
      .channel("site-content-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_content" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [router]);

  return null;
}
