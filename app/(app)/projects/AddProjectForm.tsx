"use client";

import { useRef } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { createProjectRecord } from "./actions";

export function AddProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createProjectRecord, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      {!clients.length && (
        <p className="rounded-xl bg-muted px-3.5 py-3 text-sm text-ink-soft">
          You need a client first. <Link href="/clients" className="text-moss underline">Add one</Link>, then come back.
        </p>
      )}
      <Field label="Project name" htmlFor="p-name">
        <Input id="p-name" name="name" required autoComplete="off" />
      </Field>
      <Field label="Client" htmlFor="p-client">
        <Select id="p-client" name="client_id" required placeholder="Choose a client…" options={clientOptions} disabled={!clients.length} />
      </Field>
      <Field label="Due date" htmlFor="p-due" hint="Optional.">
        <Input id="p-due" name="due_date" type="date" />
      </Field>
      <SubmitButton pendingLabel="Creating…" className="w-full sm:w-auto sm:justify-self-end">
        Add project
      </SubmitButton>
    </form>
  );
}