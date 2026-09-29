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
import { createLead } from "./actions";

export function AddLeadForm({
  applications,
  defaultApplicationId,
}: {
  applications: ApplicationOption[];
  defaultApplicationId: string | null;
}) {
  const [state, formAction] = useFormState(createLead, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="l-name">
        <Input id="l-name" name="name" required autoComplete="off" />
      </Field>
      <Field label="Email" htmlFor="l-email">
        <Input id="l-email" name="email" type="email" autoComplete="off" />
      </Field>
      <Field label="Company" htmlFor="l-company">
        <Input id="l-company" name="company" autoComplete="off" />
      </Field>
      <Field label="Source" htmlFor="l-source" hint="Where you found them, e.g. referral.">
        <Input id="l-source" name="source" autoComplete="off" />
      </Field>
      {!!applications.length && (
        <Field label="Application" htmlFor="l-application" className="sm:col-span-2">
          <Select
            id="l-application"
            name="application_id"
            defaultValue={defaultApplicationId ?? ""}
            emptyLabel="None"
            options={applications.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>
      )}
      <SubmitButton pendingLabel="Adding…" className="w-full sm:col-span-2 sm:w-auto sm:justify-self-end">
        Add lead
      </SubmitButton>
    </form>
  );
}