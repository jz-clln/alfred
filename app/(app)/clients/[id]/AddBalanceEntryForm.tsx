"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { addBalanceEntry } from "../actions";

export function AddBalanceEntryForm({ clientId }: { clientId: string }) {
  const boundAction = addBalanceEntry.bind(null, clientId);
  const [state, formAction] = useFormState(boundAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <Field label="Type" htmlFor="b-type">
        <Select
          id="b-type"
          name="type"
          defaultValue="invoice"
          options={[
            { value: "invoice", label: "Invoice (they owe you)" },
            { value: "payment", label: "Payment (they paid you)" },
          ]}
        />
      </Field>
      <Field label="Amount" htmlFor="b-amount">
        <Input id="b-amount" name="amount" type="number" step="0.01" min="0" inputMode="decimal" required />
      </Field>
      <Field label="Memo" htmlFor="b-memo" hint="Optional. Shows in the ledger.">
        <Input id="b-memo" name="memo" autoComplete="off" />
      </Field>
      <SubmitButton pendingLabel="Logging…" className="w-full sm:w-auto sm:justify-self-end">
        Add entry
      </SubmitButton>
    </form>
  );
}