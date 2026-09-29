"use client";

import { useRef } from "react";
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

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Project name" htmlFor="p-name" className="sm:col-span-2">
        <Input id="p-name" name="name" required autoComplete="off" />
      </Field>
      <Field label="Client" htmlFor="p-client">
        <Select
          id="p-client"
          name="client_id"
          emptyLabel={clients.length ? "Select…" : "No clients yet"}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="Due date" htmlFor="p-due">
        <Input id="p-due" name="due_date" type="date" />
      </Field>
      <SubmitButton pendingLabel="Creating…" className="w-full sm:col-span-2 sm:w-auto sm:justify-self-end">
        Add project
      </SubmitButton>
    </form>
  );
}