"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { createProposal } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { useFormFeedback } from "@/components/useFormFeedback";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/SubmitButton";

export function ProposalForm({ scope, recipients }: {
  scope: string | null; recipients: { value: string; label: string }[];
}) {
  const [state, action] = useFormState(createProposal.bind(null, scope), initialActionState);
  const ref = useRef<HTMLFormElement>(null);
  useFormFeedback(state, ref);
  return <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
    <Field label="Document type" htmlFor="proposal-kind">
      <Select id="proposal-kind" name="kind" defaultValue="proposal"
        options={[{ value: "proposal", label: "Proposal" }, { value: "quote", label: "Quote" }]} />
    </Field>
    <Field label="Recipient" htmlFor="proposal-recipient">
      <Select id="proposal-recipient" name="recipient" required placeholder="Choose a lead or client"
        options={recipients} disabled={!recipients.length} />
    </Field>
    {!recipients.length && <p className="text-sm text-ink-soft sm:col-span-2">Add a lead or client in this view first.</p>}
    <Field label="Title / project name" htmlFor="proposal-title" className="sm:col-span-2">
      <Input id="proposal-title" name="title" required maxLength={200} placeholder="e.g. Website redesign" />
    </Field>
    <Field label="Scope of work and terms" htmlFor="proposal-description" className="sm:col-span-2"
      hint="Describe deliverables, timeline, inclusions and payment terms. This text is included in the email.">
      <Textarea id="proposal-description" name="description" required maxLength={20000} rows={7} />
    </Field>
    <Field label="Total amount" htmlFor="proposal-amount">
      <Input id="proposal-amount" name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" max="9999999999.99" required />
    </Field>
    <Field label="Quote currency" htmlFor="proposal-currency">
      <Select id="proposal-currency" name="currency" defaultValue="PHP"
        options={[{ value: "PHP", label: "PHP — Philippine peso" }, { value: "USD", label: "USD — US dollar" }]} />
    </Field>
    <Field label="Valid until (optional)" htmlFor="proposal-valid-until">
      <Input id="proposal-valid-until" name="valid_until" type="date" />
    </Field>
    <div className="flex items-end justify-end"><SubmitButton pendingLabel="Saving…">Save draft</SubmitButton></div>
  </form>;
}
