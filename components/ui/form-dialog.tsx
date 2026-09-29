"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CloseContext = createContext<() => void>(() => {});

// Forms call this after a successful save. Outside a dialog it does nothing.
export const useCloseDialog = () => useContext(CloseContext);

// Server pages pass a form as children:
//   <FormDialog triggerLabel="Add client" title="Add a client"><AddClientForm /></FormDialog>
export function FormDialog({
  triggerLabel,
  title,
  description,
  variant = "default",
  wide = false,
  children,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  variant?: "default" | "secondary" | "outline";
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="shrink-0">
          <Plus aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className={wide ? "md:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>
        <CloseContext.Provider value={() => setOpen(false)}>{children}</CloseContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
