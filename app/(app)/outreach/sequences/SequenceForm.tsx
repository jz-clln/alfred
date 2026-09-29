"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { createSequence } from "./actions";

const DEFAULTS = [
  { delay: 3, subject: "Following up, {{first_name}}", body: "Hi {{first_name}},\n\nJust checking that my last note reached you. Happy to answer any questions.\n" },
  { delay: 4, subject: "", body: "" },
  { delay: 7, subject: "", body: "" },
];

export function SequenceForm() {
  const [state, formAction] = useFormState(createSequence, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <Field label="Sequence name" htmlFor="s-name">
        <Input id="s-name" name="name" required autoComplete="off" placeholder="e.g. Cold intro" />
      </Field>

      {DEFAULTS.map((d, i) => (
        <fieldset key={i} className="space-y-3 rounded-2xl bg-muted/60 p-4">
          <legend className="sr-only">Follow-up {i + 1}</legend>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="font-medium text-ink">Follow-up {i + 1}</span>
            <span>sent</span>
            <Input
              name={`delay_${i + 1}`}
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={d.delay}
              aria-label={`Days after previous email, follow-up ${i + 1}`}
              className="h-10 w-16 bg-card text-center"
            />
            <span>days after the previous email</span>
          </div>
          <Field label="Subject" htmlFor={`s-subject-${i}`}>
            <Input id={`s-subject-${i}`} name={`subject_${i + 1}`} defaultValue={d.subject} className="bg-card" />
          </Field>
          <Field label="Message" htmlFor={`s-body-${i}`}>
            <Textarea id={`s-body-${i}`} name={`body_${i + 1}`} defaultValue={d.body} rows={4} className="resize-y bg-card" />
          </Field>
        </fieldset>
      ))}

      <p className="text-xs text-ink-soft">
        Leave a follow-up empty to skip it. A reply, booking, or bounce stops the sequence automatically.
      </p>
      <SubmitButton pendingLabel="Saving…" className="w-full sm:w-auto">Save sequence</SubmitButton>
    </form>
  );
}
