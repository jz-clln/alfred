"use client";

import { useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

interface Person { id: string; name: string; email: string | null; bad?: boolean }

const MAX_RECIPIENTS = 50; // keep in sync with actions.ts

function RecipientList({
  title, prefix, people, checked, toggle, setAll,
}: {
  title: string; prefix: string; people: Person[];
  checked: Set<string>; toggle: (k: string) => void; setAll: (keys: string[], on: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return people;
    return people.filter((p) => p.name.toLowerCase().includes(s) || (p.email ?? "").toLowerCase().includes(s));
  }, [q, people]);

  const usable = shown.filter((p) => p.email && !p.bad).map((p) => `${prefix}:${p.id}`);
  const allOn = usable.length > 0 && usable.every((k) => checked.has(k));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        {!!usable.length && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAll(usable, !allOn)}>
            {allOn ? "Clear" : q ? "Select shown" : "Select all"}
          </Button>
        )}
      </div>
      {people.length > 5 && (
        <Input
          type="search"
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder={`Search ${title.toLowerCase()}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-2 h-10"
        />
      )}
      <ul className="max-h-56 divide-y divide-border/70 overflow-y-auto rounded-2xl bg-card">
        {shown.map((p) => {
          const key = `${prefix}:${p.id}`;
          const disabled = !p.email || p.bad;
          return (
            <li key={key}>
              <label className={`flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm ${disabled ? "opacity-60" : "cursor-pointer"}`}>
                {/* No name here: submitted values come from the hidden inputs
                    in the form, so filtered-out picks are never lost. */}
                <input
                  type="checkbox"
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
        {!!people.length && !shown.length && <li className="px-4 py-4 text-sm text-ink-soft">No matches.</li>}
      </ul>
    </div>
  );
}

export function ComposeForm({
  clients, leads, sequences, sendAction, initialChecked = [],
}: {
  clients: Person[]; leads: Person[]; sequences: { id: string; name: string }[]; initialChecked?: string[];
  sendAction: (previous: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(sendAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [checked, setChecked] = useState<Set<string>>(() => {
    const available = new Set([
      ...clients.filter((p) => p.email && !p.bad).map((p) => `client:${p.id}`),
      ...leads.filter((p) => p.email && !p.bad).map((p) => `lead:${p.id}`),
    ]);
    return new Set(initialChecked.filter((id) => available.has(id)));
  });
  useFormFeedback(state, formRef, () => setChecked(new Set()));

  const toggle = (k: string) =>
    setChecked((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const setAll = (keys: string[], on: boolean) =>
    setChecked((prev) => { const n = new Set(prev); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });

  const tooMany = checked.size > MAX_RECIPIENTS;

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {[...checked].map((k) => (
        <input key={k} type="hidden" name="recipients" value={k} />
      ))}

      <div className="grid gap-5 md:grid-cols-2">
        <RecipientList title="Leads" prefix="lead" people={leads} checked={checked} toggle={toggle} setAll={setAll} />
        <RecipientList title="Clients" prefix="client" people={clients} checked={checked} toggle={toggle} setAll={setAll} />
      </div>

      <div className="space-y-4">
        <Field label="Subject" htmlFor="o-subject">
          <Input id="o-subject" name="subject" required autoComplete="off" />
        </Field>
        <Field
          label="Message"
          htmlFor="o-body"
          hint="Personalise with {{first_name}}, {{name}} and {{company}}. Each person gets their own copy."
        >
          <Textarea id="o-body" name="body" required rows={9} placeholder={"Hi {{first_name}},\n\n…"} className="resize-y leading-relaxed" />
        </Field>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field label="Automatic follow-ups" htmlFor="o-seq" className="w-full sm:w-72">
          <Select
            id="o-seq"
            name="sequence_id"
            emptyLabel="No follow-ups"
            options={sequences.map((s) => ({ value: s.id, label: "“" + s.name + "” (leads only)" }))}
          />
        </Field>
        <div className="w-full text-right sm:w-auto">
          {tooMany && (
            <p role="alert" className="mb-2 text-sm text-destructive">
              Max {MAX_RECIPIENTS} per send. Unselect {checked.size - MAX_RECIPIENTS}.
            </p>
          )}
          <SubmitButton pendingLabel="Sending…" className="w-full sm:w-auto">
            {checked.size ? `Send to ${checked.size}` : "Send"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
