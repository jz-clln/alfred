"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { field, label } from "@/components/ui/kit";
import { scheduleMeeting } from "./actions";

export function ScheduleMeetingForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(scheduleMeeting, initialActionState);
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
      <select name="client_id" required aria-label="Client" className={field}>
        <option value="">Choose a client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input name="title" required placeholder="Title" className={field} />
      <div>
        <label htmlFor="m-date" className={label}>Date</label>
        <input id="m-date" name="date" type="date" required className={field} />
      </div>
      <div>
        <label htmlFor="m-time" className={label}>Time (Philippine time)</label>
        <input id="m-time" name="time" type="time" required className={field} />
      </div>
      <div>
        <label htmlFor="m-min" className={label}>Minutes</label>
        <input id="m-min" name="duration" type="number" defaultValue={30} min={15} step={15} className={field} />
      </div>
      <div className="flex items-end">
        <SubmitButton pendingLabel="Scheduling…">Schedule</SubmitButton>
      </div>
    </form>
  );
}
