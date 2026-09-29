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
import { scheduleMeeting } from "./actions";

const DURATIONS = [15, 30, 45, 60, 90];

export function ScheduleMeetingForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(scheduleMeeting, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      {!clients.length && (
        <p className="rounded-xl bg-muted px-3.5 py-3 text-sm text-ink-soft sm:col-span-2">
          You need a client first. <Link href="/clients" className="text-moss underline">Add one</Link>, then come back.
        </p>
      )}
      <Field label="Client" htmlFor="m-client">
        <Select id="m-client" name="client_id" required placeholder="Choose a client…" options={clientOptions} disabled={!clients.length} />
      </Field>
      <Field label="Title" htmlFor="m-title">
        <Input id="m-title" name="title" required autoComplete="off" />
      </Field>
      <Field label="Date" htmlFor="m-date">
        <Input id="m-date" name="date" type="date" required />
      </Field>
      <Field label="Time (Philippine time)" htmlFor="m-time">
        <Input id="m-time" name="time" type="time" required />
      </Field>
      <Field label="Length" htmlFor="m-min" className="sm:col-span-2">
        <Select
          id="m-min"
          name="duration"
          defaultValue="30"
          options={DURATIONS.map((d) => ({ value: String(d), label: d + " minutes" }))}
        />
      </Field>
      <SubmitButton pendingLabel="Scheduling…" className="w-full sm:col-span-2 sm:w-auto sm:justify-self-end">
        Schedule
      </SubmitButton>
    </form>
  );
}