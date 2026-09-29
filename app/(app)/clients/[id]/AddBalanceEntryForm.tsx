"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { field } from "@/components/ui/kit";
import { addBalanceEntry } from "../actions";

export function AddBalanceEntryForm({ clientId }: { clientId: string }) {
  const boundAction = addBalanceEntry.bind(null, clientId);
  const [state, formAction] = useFormState(boundAction, initialActionState);
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    showToast(state.message, state.success ? "success" : "error");
    if (state.success) formRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-[auto_8rem_1fr]">
      <select name="type" aria-label="Entry type" className={field}>
        <option value="invoice">Invoice (they owe you)</option>
        <option value="payment">Payment (they paid you)</option>
      </select>
      <input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" className={field} />
      <input name="memo" placeholder="Memo" className={field} />
      <div className="sm:col-span-3">
        <SubmitButton pendingLabel="Logging…">Add entry</SubmitButton>
      </div>
    </form>
  );
}
