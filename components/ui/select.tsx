"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  name?: string;
  options: SelectOption[];
  placeholder?: string;
  /** Adds a first choice that posts "" (e.g. "No follow-ups"). Radix items can't have an empty value, so this is mapped for you. */
  emptyLabel?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  onValueChange?: (value: string) => void;
}

const EMPTY = "__empty__";

// Themed dropdown that still works in plain <form action={serverAction}>.
// Radix draws the menu. A hidden input carries the value into the form, and
// also does the "required" check (Radix's own required support breaks native
// validation: the browser can't focus its hidden control).
export function Select({
  id,
  name,
  options,
  placeholder = "Choose…",
  emptyLabel,
  defaultValue = "",
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
  onValueChange,
}: SelectProps) {
  const [value, setValue] = React.useState(defaultValue);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const hasEmpty = emptyLabel !== undefined;

  // form.reset() (used after a successful save) must reset this control too.
  React.useEffect(() => {
    const form = triggerRef.current?.form;
    if (!form) return;
    const onReset = () => setValue(defaultValue);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  const handleChange = (v: string) => {
    const next = v === EMPTY ? "" : v;
    setValue(next);
    onValueChange?.(next);
  };

  return (
    <div className="relative">
      {name && (
        <input
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          // Covers the trigger so the browser's "fill out this field" bubble
          // points at the dropdown. Focus is passed on to the real trigger.
          onFocus={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}
      <SelectPrimitive.Root
        value={hasEmpty && value === "" ? EMPTY : value}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          ref={triggerRef}
          id={id}
          aria-label={ariaLabel}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl bg-input px-3.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-[60] max-h-[min(18rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-border motion-reduce:animate-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          >
            <SelectPrimitive.Viewport className="p-1">
              {hasEmpty && <Item value={EMPTY} label={emptyLabel!} />}
              {options.map((o) => (
                <Item key={o.value} value={o.value} label={o.label} disabled={o.disabled} />
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

function Item({ value, label, disabled }: { value: string; label: string; disabled?: boolean }) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className="relative flex min-h-11 cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium"
    >
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3">
        <Check className="size-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}