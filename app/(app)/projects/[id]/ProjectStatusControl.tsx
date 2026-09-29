"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { cn } from "@/lib/utils";
import { updateProjectStatus } from "../actions";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

// Segmented control. Updates instantly, rolls back and toasts if the save fails.
export function ProjectStatusControl({ projectId, status }: { projectId: string; status: Status }) {
  const [current, setCurrent] = useState<Status>(status);
  const [pending, start] = useTransition();
  const { showToast } = useToast();

  function change(next: Status, label: string) {
    if (next === current || pending) return;
    const prev = current;
    setCurrent(next);
    start(async () => {
      try {
        await updateProjectStatus(projectId, next);
        showToast(`Marked ${label.toLowerCase()}.`);
      } catch {
        setCurrent(prev);
        showToast("Couldn't update the status.", "error");
      }
    });
  }

  return (
    <div role="group" aria-label="Status" aria-busy={pending} className="inline-flex rounded-xl bg-muted p-1">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-pressed={current === s.value}
          disabled={pending}
          onClick={() => change(s.value, s.label)}
          className={cn(
            "tap min-h-11 rounded-lg px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-wait",
            current === s.value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
