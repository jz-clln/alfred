"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/toast/ToastProvider";
import { sendProposal, acceptProposal, declineProposal } from "./actions";
import type { ProposalStatus } from "@/lib/proposals";

export function ProposalActions({ id, scope, status, projectId, recipientEmail, expired }: {
  id: string; scope: string | null; status: ProposalStatus; projectId: string | null;
  recipientEmail: string | null; expired: boolean;
}) {
  const [confirm, setConfirm] = useState<"send" | "accept" | "decline" | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function submit() {
    if (busy || !confirm) return;
    setBusy(true);
    try {
      if (confirm === "send") showToast(await sendProposal(scope, id));
      else if (confirm === "accept") {
        const project = await acceptProposal(scope, id);
        showToast("Accepted. Project created.");
        router.push(`/projects/${project}`);
      } else {
        await declineProposal(scope, id);
        showToast("Marked declined.");
      }
      setConfirm(null);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't complete that action.", "error");
    } finally { setBusy(false); }
  }

  return <>
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && <Button disabled={!recipientEmail || expired} onClick={() => setConfirm("send")}>Send email</Button>}
      {status === "sent" && <>
        <Button disabled={expired} onClick={() => setConfirm("accept")}>Record acceptance & create project</Button>
        <Button variant="ghost" onClick={() => setConfirm("decline")}>Mark declined</Button>
      </>}
      {status === "accepted" && projectId && <Button asChild variant="secondary"><Link href={`/projects/${projectId}`}>Open project</Link></Button>}
      {status === "sending" && <p className="text-sm text-ink-soft">Send in progress. If this persists, check sent mail before trying again.</p>}
      {status === "draft" && !recipientEmail && <p className="text-sm text-rust">This recipient needs an email address before sending.</p>}
      {expired && ["draft", "sent"].includes(status) && <p className="text-sm text-rust">Expired. Create a new draft with updated terms.</p>}
    </div>
    <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirm === "send" ? "Send this document?" : confirm === "accept" ? "Has the customer accepted?" : "Mark this document declined?"}</DialogTitle>
          <DialogDescription>
            {confirm === "send" ? `The title, scope, terms and quoted amount will be emailed to ${recipientEmail}.`
              : confirm === "accept" ? "Record acceptance only after the customer agrees. Alfred will create an active project and, for a lead, create or reuse their client record. No invoice is created."
              : "This records the customer's decision. No project will be created."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{busy ? "Working…" : confirm === "send" ? "Send email" : confirm === "accept" ? "Accepted — create project" : "Mark declined"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
