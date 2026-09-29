"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { field } from "@/components/ui/kit";
import { createClientRecord } from "./actions";

export function AddClientForm() {
  const [state, formAction] = useFormState(createClientRecord, initialActionState);
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    showToast(state.message, state.success ? "success" : "error");
    if (state.success) formRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input name="name" required placeholder="Name" className={field} />
      <input name="email" type="email" placeholder="Email" className={field} />
      <input name="phone" type="tel" placeholder="Phone" className={field} />
      <div className="sm:col-span-3">
        <SubmitButton pendingLabel="Adding…">Add client</SubmitButton>
      </div>
    </form>
  );
}
