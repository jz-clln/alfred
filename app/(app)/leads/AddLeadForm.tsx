"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { createLead } from "./actions";

const input =
  "w-full rounded-xl bg-fill px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-moss/30";

export function AddLeadForm() {
  const [state, formAction] = useFormState(createLead, initialActionState);
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    showToast(state.message, state.success ? "success" : "error");
    if (state.success) formRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required placeholder="Name" className={input} />
      <input name="email" type="email" placeholder="Email" className={input} />
      <input name="company" placeholder="Company" className={input} />
      <input name="source" placeholder="Where you found them" className={input} />
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Adding…" className="tap rounded-xl bg-moss px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Add lead
        </SubmitButton>
      </div>
    </form>
  );
}
