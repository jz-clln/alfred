"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { setClientCurrency } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { useFormFeedback } from "@/components/useFormFeedback";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/SubmitButton";
import type { Currency } from "@/lib/money";

export function ClientCurrencyForm({ clientId, currency }: { clientId: string; currency: Currency }) {
  const [state, action] = useFormState(setClientCurrency.bind(null, clientId), initialActionState);
  const ref = useRef<HTMLFormElement>(null);
  useFormFeedback(state, ref);
  return <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
    <Field label="Billing currency" htmlFor="client-currency">
      <Select id="client-currency" name="currency" defaultValue={currency}
        options={[{ value: "PHP", label: "PHP — Philippine peso" }, { value: "USD", label: "USD — US dollar" }]} />
    </Field>
    <SubmitButton pendingLabel="Saving…">Save currency</SubmitButton>
  </form>;
}
