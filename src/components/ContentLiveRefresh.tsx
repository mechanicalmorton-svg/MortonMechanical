"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SITE_CONTENT_BROADCAST } from "@/lib/site-content-live";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

/** Refreshes public pages when site content changes (save or Supabase realtime). */
export function ContentLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();

    // Instant update in other open tabs on this computer after Save.
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SITE_CONTENT_BROADCAST);
      channel.onmessage = () => refresh();
    } catch {
      /* BroadcastChannel unavailable */
    }

    const sb = getSupabaseBrowser();
    let supabaseChannel: ReturnType<NonNullable<typeof sb>["channel"]> | null = null;
    if (sb) {
      supabaseChannel = sb
        .channel("site-content-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "site_content" },
          () => refresh(),
        )
        .subscribe();
    }

    return () => {
      channel?.close();
      if (sb && supabaseChannel) sb.removeChannel(supabaseChannel);
    };
  }, [router]);

  return null;
}
