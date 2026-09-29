"use client";

import Link from "next/link";
import { analyzeLeadWithJev } from "./jev-actions";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { checkLeadEmail, markLeadReplied, setLeadStage, convertLeadToClient, setLeadTemperature } from "./actions";

type Lead = { id: string; name: string; stage: string; email: string | null };
type Key = "email" | "check" | "replied" | "meeting" | "client";

// The one obvious next step per stage gets a button. Everything else, and the
// destructive "Lost", lives in the menu.
const PRIMARY: Record<string, Key> = {
  new: "email",
  contacted: "replied",
  replied: "meeting",
  meeting: "client",
};

export function LeadActions({ lead }: { lead: Lead }) {
  const [pending, start] = useTransition();
  const [confirmLost, setConfirmLost] = useState(false);
  const [jevOpen, setJevOpen] = useState(false);
  const [context, setContext] = useState("");
  const { showToast } = useToast();

  function run(fn: () => Promise<string | void>, ok: string) {
    start(async () => {
      try {
        const msg = await fn();
        showToast(msg || ok);
      } catch (e) {
        // A redirect (Make client) is not an error. Let Next handle it.
        if ((e as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
        showToast("Couldn't save that. Try again.", "error");
      }
    });
  }

  const actions: Record<Key, { label: string; href?: string; go?: () => void }> = {
    email: { label: "Write email", href: `/outreach?to=lead:${lead.id}` },
    check: {
      label: "Check email",
      go: () =>
        run(async () => {
          const s = await checkLeadEmail(lead.id);
          return s === "valid" ? "Email looks good." : s === "risky" ? "Email is risky." : "Email can't receive mail.";
        }, "Checked."),
    },
    replied: { label: "Mark replied", go: () => run(() => markLeadReplied(lead.id), "Marked as replied.") },
    meeting: { label: "Meeting booked", go: () => run(() => setLeadStage(lead.id, "meeting"), "Meeting booked.") },
    client: { label: "Make client", go: () => run(() => convertLeadToClient(lead.id), "Converted to client.") },
  };

  const primaryKey = PRIMARY[lead.stage] ?? "client";
  const primary = actions[primaryKey];
  const menuKeys = (Object.keys(actions) as Key[]).filter(
    (k) => k !== primaryKey && (lead.email || (k !== "email" && k !== "check"))
  );
  const showPrimary = primaryKey !== "email" || !!lead.email;

  return (
    <div className="mt-2 flex items-center gap-2">
      {showPrimary &&
        (primary.href ? (
          <Button asChild variant="secondary">
            <Link href={primary.href}>{primary.label}</Link>
          </Button>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={primary.go}>
            {primary.label}
          </Button>
        ))}

      {/* modal={false}: lets the confirm dialog open right after the menu closes. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label={`More actions for ${lead.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {menuKeys.map((k) =>
            actions[k].href ? (
              <DropdownMenuItem key={k} asChild>
                <Link href={actions[k].href!}>{actions[k].label}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={k} onSelect={actions[k].go}>
                {actions[k].label}
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setJevOpen(true)}>Analyze with JEV</DropdownMenuItem>
          {(["hot", "warm", "cold"] as const).map((temperature) => (
            <DropdownMenuItem key={temperature} onSelect={() => run(() => setLeadTemperature(lead.id, temperature), `Marked ${temperature}.`)}>
              Set {temperature}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => run(() => setLeadTemperature(lead.id, null), "Automatic scoring restored.")}>
            Use automatic scoring
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmLost(true)}>
            Mark as lost
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={jevOpen} onOpenChange={setJevOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qualify {lead.name} with JEV</DialogTitle>
            <DialogDescription>Analyze saved notes and the five latest email replies. You can also paste a conversation below. This text is sent to JEV; manual temperature settings take priority.</DialogDescription>
          </DialogHeader>
          <label htmlFor={`jev-context-${lead.id}`} className="text-sm">Additional lead conversation (optional)</label>
          <textarea id={`jev-context-${lead.id}`} className="min-h-36 w-full rounded-md border p-3 text-sm" value={context} onChange={e => setContext(e.target.value)} maxLength={12000} disabled={pending} />
          <Button disabled={pending} onClick={() => start(async () => {
            try {
              const result = await analyzeLeadWithJev(lead.id, context);
              if (result.error) showToast(result.error, "error");
              else { showToast("JEV assessment saved. Manual settings still take priority."); setJevOpen(false); }
            } catch { showToast("Analysis failed. Please try again.", "error"); }
          })}>{pending ? "Analyzing…" : "Analyze with JEV"}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmLost} onOpenChange={setConfirmLost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {lead.name} as lost?</DialogTitle>
            <DialogDescription>
              Their follow-ups stop. You can't undo this from the app.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmLost(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmLost(false);
                run(() => setLeadStage(lead.id, "lost"), "Marked as lost.");
              }}
            >
              Mark as lost
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
