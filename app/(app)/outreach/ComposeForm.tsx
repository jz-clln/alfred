"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { sendEmails } from "./actions";

interface Person { id: string; name: string; email: string | null; bad?: boolean }

const field =
  "w-full rounded-xl bg-fill px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-soft/70 focus:ring-2 focus:ring-moss/30";

function RecipientList({
  title, prefix, people, checked, toggle, setAll,
}: {
  title: string; prefix: string; people: Person[];
  checked: Set<string>; toggle: (k: string) => void; setAll: (keys: string[], on: boolean) => void;
}) {
  const usable = people.filter((p) => p.email && !p.bad).map((p) => `${prefix}:${p.id}`);
  const allOn = usable.length > 0 && usable.every((k) => checked.has(k));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-ink-soft">{title}</span>
        {!!usable.length && (
          <button type="button" onClick={() => setAll(usable, !allOn)} className="text-xs text-moss">
            {allOn ? "Clear" : "Select all"}
          </button>
        )}
      </div>
      <ul className="max-h-56 divide-y divide-line/70 overflow-y-auto rounded-2xl bg-surface">
        {people.map((p) => {
          const key = `${prefix}:${p.id}`;
          const disabled = !p.email || p.bad;
          return (
            <li key={key}>
              <label className={`flex items-center gap-3 px-4 py-2.5 text-sm ${disabled ? "opacity-45" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  name="recipients"
                  value={key}
                  disabled={disabled}
                  checked={checked.has(key)}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 accent-moss"
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="truncate text-xs text-ink-soft">{p.bad ? "bad email" : p.email ?? "no email"}</span>
              </label>
            </li>
          );
        })}
        {!people.length && <li className="px-4 py-4 text-sm text-ink-soft">Nobody here yet.</li>}
      </ul>
    </div>
  );
}

export function ComposeForm({
  clients, leads, sequences, initialChecked = [],
}: {
  clients: Person[]; leads: Person[]; sequences: { id: string; name: string }[]; initialChecked?: string[];
}) {
  const [state, formAction] = useFormState(sendEmails, initialActionState);
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));

  useEffect(() => {
    if (!state.message) return;
    showToast(state.message, state.success ? "success" : "error");
    if (state.success) { formRef.current?.reset(); setChecked(new Set()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const toggle = (k: string) =>
    setChecked((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const setAll = (keys: string[], on: boolean) =>
    setChecked((prev) => { const n = new Set(prev); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <RecipientList title="Leads" prefix="lead" people={leads} checked={checked} toggle={toggle} setAll={setAll} />
        <RecipientList title="Clients" prefix="client" people={clients} checked={checked} toggle={toggle} setAll={setAll} />
      </div>

      <div className="space-y-3">
        <input name="subject" required placeholder="Subject" className={field} />
        <textarea
          name="body"
          required
          rows={9}
          placeholder={"Hi {{first_name}},\n\n…"}
          className={`${field} resize-y leading-relaxed`}
        />
        <p className="text-xs text-ink-soft">
          Personalise with {"{{first_name}}"}, {"{{name}}"} and {"{{company}}"}. Each person gets their own copy.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select name="sequence_id" className="rounded-xl bg-fill px-3.5 py-2.5 text-sm">
          <option value="">No follow-ups</option>
          {sequences.map((s) => (
            <option key={s.id} value={s.id}>Follow up with “{s.name}” (leads only)</option>
          ))}
        </select>
        <SubmitButton
          pendingLabel="Sending…"
          className="tap rounded-xl bg-moss px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {checked.size ? `Send to ${checked.size}` : "Send"}
        </SubmitButton>
      </div>
    </form>
  );
}
