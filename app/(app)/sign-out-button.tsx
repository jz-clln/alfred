"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// variant "link": small underlined text (desktop sidebar).
// variant "row": full-width button (phone "More" sheet).
export default function SignOutButton({ variant = "link" }: { variant?: "link" | "row" }) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (variant === "row") {
    return (
      <Button variant="outline" className="w-full justify-start" onClick={handleSignOut} disabled={pending}>
        <LogOut aria-hidden="true" />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={pending}
      className="py-2 text-xs text-ink-soft underline decoration-line underline-offset-4 hover:text-ink disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
