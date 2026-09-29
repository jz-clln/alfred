"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { field } from "@/components/ui/kit";
import { createProjectRecord } from "./actions";

export function AddProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createProjectRecord, initialActionState);
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
      <input name="name" required placeholder="Project name" className={`${field} sm:col-span-2`} />
      <select name="client_id" required aria-label="Client" className={field}>
        <option value="">Choose a client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <div>
        <label htmlFor="due_date" className="sr-only">Due date</label>
        <input id="due_date" name="due_date" type="date" className={field} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Creating…">Add project</SubmitButton>
      </div>
    </form>
  );
}
