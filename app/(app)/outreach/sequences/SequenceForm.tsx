"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { createSequence } from "./actions";

const field =
  "w-full rounded-xl bg-fill px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-moss/30";

const DEFAULTS = [
  { delay: 3, subject: "Following up, {{first_name}}", body: "Hi {{first_name}},\n\nJust checking that my last note reached you. Happy to answer any questions.\n" },
  { delay: 4, subject: "", body: "" },
  { delay: 7, subject: "", body: "" },
];

export function SequenceForm() {
  const [state, formAction] = useFormState(createSequence, initialActionState);
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    showToast(state.message, state.success ? "success" : "error");
    if (state.success) formRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input name="name" required placeholder="Sequence name, e.g. Cold intro" className={field} />
      {DEFAULTS.map((d, i) => (
        <fieldset key={i} className="space-y-2.5 rounded-2xl bg-surface p-4">
          <legend className="sr-only">Follow-up {i + 1}</legend>
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <span>Follow-up {i + 1}, sent</span>
            <input name={`delay_${i + 1}`} type="number" min={0} defaultValue={d.delay} className="w-16 rounded-lg bg-fill px-2.5 py-1.5 text-center text-sm text-ink" />
            <span>days after the previous email</span>
          </div>
          <input name={`subject_${i + 1}`} defaultValue={d.subject} placeholder="Subject" className={field} />
          <textarea name={`body_${i + 1}`} defaultValue={d.body} rows={4} placeholder="Message" className={`${field} resize-y`} />
        </fieldset>
      ))}
      <p className="text-xs text-ink-soft">Leave a follow-up empty to skip it. A reply, booking, or bounce stops the sequence automatically.</p>
      <SubmitButton pendingLabel="Saving…" className="tap rounded-xl bg-moss px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
        Save sequence
      </SubmitButton>
    </form>
  );
}
