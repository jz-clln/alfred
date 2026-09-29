"use client";

import { useEffect, useState, useTransition } from "react";
import { setDisplayCurrency } from "@/app/(app)/currency-actions";
import { useToast } from "@/components/toast/ToastProvider";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/money";

const OPTIONS: { value: Currency; symbol: string }[] = [
  { value: "PHP", symbol: "₱" },
  { value: "USD", symbol: "$" },
];

// Two choices, so a segmented control beats a dropdown: one tap, both options
// always visible. Updates instantly, rolls back and toasts if saving fails.
// large: 44px targets for touch (phone "More" sheet).
export function CurrencySwitcher({
  currency,
  large = false,
  className,
}: {
  currency: Currency;
  large?: boolean;
  className?: string;
}) {
  const [current, setCurrent] = useState<Currency>(currency);
  const [pending, start] = useTransition();
  const { showToast } = useToast();

  useEffect(() => setCurrent(currency), [currency]);

  function choose(next: Currency) {
    if (next === current || pending) return;
    const prev = current;
    setCurrent(next);
    start(async () => {
      try {
        await setDisplayCurrency(next);
        showToast(`Showing amounts in ${next}.`);
      } catch {
        setCurrent(prev);
        showToast("Couldn't change display currency.", "error");
      }
    });
  }

  return (
    <div
      role="group"
      aria-label="Display currency"
      aria-busy={pending}
      className={cn("inline-flex rounded-xl bg-muted p-1", className)}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={current === o.value}
          disabled={pending}
          onClick={() => choose(o.value)}
          className={cn(
            "tap flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-wait",
            large ? "min-h-11" : "min-h-9",
            current === o.value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span aria-hidden="true">{o.symbol}</span>
          {o.value}
        </button>
      ))}
    </div>
  );
}