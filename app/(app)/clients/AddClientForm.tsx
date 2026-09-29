"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { ApplicationOption } from "@/components/ApplicationSwitcher";
import { createClientRecord } from "./actions";

export function AddClientForm({
  applications,
  defaultApplicationId,
}: {
  applications: ApplicationOption[];
  defaultApplicationId: string | null;
}) {
  const [state, formAction] = useFormState(createClientRecord, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="c-name">
        <Input id="c-name" name="name" required autoComplete="off" />
      </Field>
      <Field label="Email" htmlFor="c-email">
        <Input id="c-email" name="email" type="email" autoComplete="off" />
      </Field>
      <Field label="Phone" htmlFor="c-phone">
        <Input id="c-phone" name="phone" autoComplete="off" />
      </Field>
      <Field label="Billing currency" htmlFor="c-currency" hint="Invoices and payments use this currency.">
        <Select id="c-currency" name="currency" defaultValue="PHP"
          options={[{ value: "PHP", label: "PHP — Philippine peso" }, { value: "USD", label: "USD — US dollar" }]} />
      </Field>
      {!!applications.length && (
        <Field label="Application" htmlFor="c-application">
          <Select
            id="c-application"
            name="application_id"
            defaultValue={defaultApplicationId ?? ""}
            emptyLabel="None"
            options={applications.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>
      )}
      <SubmitButton pendingLabel="Adding…" className="w-full sm:col-span-2 sm:w-auto sm:justify-self-end">
        Add client
      </SubmitButton>
    </form>
  );
}
