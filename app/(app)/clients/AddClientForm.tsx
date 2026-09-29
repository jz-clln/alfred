"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { createClientRecord } from "./actions";

export function AddClientForm() {
  const [state, formAction] = useFormState(createClientRecord, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <Field label="Name" htmlFor="c-name">
        <Input id="c-name" name="name" required autoComplete="off" />
      </Field>
      <Field label="Email" htmlFor="c-email">
        <Input id="c-email" name="email" type="email" autoComplete="off" />
      </Field>
      <Field label="Phone" htmlFor="c-phone">
        <Input id="c-phone" name="phone" type="tel" autoComplete="off" />
      </Field>
      <SubmitButton pendingLabel="Adding…" className="w-full sm:w-auto sm:justify-self-end">
        Add client
      </SubmitButton>
    </form>
  );
}
