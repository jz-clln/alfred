"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";

const POLL_MS = 3 * 60_000;

// Renders nothing. While Alfred is open it (1) asks Gmail for new replies every
// few minutes, and (2) listens on Supabase Realtime, so a reply found by any
// tab, the button or the daily cron shows up here instantly as a toast.
export function ReplyWatcher() {
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel("alfred-inbound-emails")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "inbound_emails" }, (payload) => {
        const r = payload.new as { from_name?: string | null; from_email?: string };
        showToast(`New reply from ${r.from_name || r.from_email || "someone"}.`);
        router.refresh();
      })
      .subscribe();

    let stopped = false; // stop polling once Google needs reconnecting
    const tick = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/gmail/sync", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (json?.reconnect) stopped = true;
      } catch {
        /* offline: try again next time */
      }
    };
    const first = setTimeout(tick, 4_000);
    const timer = setInterval(tick, POLL_MS);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
