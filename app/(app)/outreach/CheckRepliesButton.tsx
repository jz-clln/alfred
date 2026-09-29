"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";

export function CheckRepliesButton({ lastChecked }: { lastChecked: string | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [reconnect, setReconnect] = useState(false);

  async function check() {
    setBusy(true);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setReconnect(false);
        showToast(
          json.added
            ? `${json.added} new ${json.added === 1 ? "reply" : "replies"}.`
            : json.bounces
              ? `${json.bounces} email ${json.bounces === 1 ? "address" : "addresses"} bounced.`
              : "No new replies."
        );
        router.refresh();
      } else {
        setReconnect(!!json.reconnect);
        showToast(json.error || "Couldn't check for replies.", "error");
      }
    } catch {
      showToast("Couldn't reach Gmail. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="secondary" onClick={check} disabled={busy} className="shrink-0">
        <RefreshCw className={busy ? "animate-spin" : undefined} aria-hidden="true" />
        {busy ? "Checking…" : "Check for replies"}
      </Button>
      {reconnect && (
        <a href="/api/google/connect" className="text-sm text-moss underline underline-offset-4">
          Reconnect Google
        </a>
      )}
      {!reconnect && lastChecked && (
        <span className="text-xs text-ink-soft">
          Last checked{" "}
          {new Date(lastChecked).toLocaleTimeString("en-PH", {
            timeZone: "Asia/Manila",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}
