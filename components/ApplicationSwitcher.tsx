"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, ChevronsUpDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/SubmitButton";
import { useFormFeedback } from "@/components/useFormFeedback";
import { useToast } from "@/components/toast/ToastProvider";
import { initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createApplication, setActiveApplication, renameApplication, deleteApplication } from "@/app/(app)/applications/actions";
import { UNASSIGNED_APPLICATION, applicationColor } from "@/lib/application-scope";

export interface ApplicationOption {
  id: string;
  name: string;
}

function ApplicationDot({ id }: { id: string | null }) {
  return <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full"
    style={{ backgroundColor: id && id !== UNASSIGNED_APPLICATION ? applicationColor(id) : "#777777" }} />;
}

function DeleteButton({ confirmed }: { confirmed: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="destructive" disabled={!confirmed || pending}>
    {pending ? "Deleting…" : "Delete application"}
  </Button>;
}

function ManageApplicationForm({ application, mode, onDone }: {
  application: ApplicationOption; mode: "rename" | "delete"; onDone: () => void;
}) {
  const action = mode === "rename" ? renameApplication : deleteApplication;
  const [state, formAction] = useFormState(action.bind(null, application.id), initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmation, setConfirmation] = useState("");
  useFormFeedback(state, formRef, onDone);
  return <form ref={formRef} action={formAction} className="grid gap-4">
    {mode === "rename" ? (
      <Field label="Application name" htmlFor="rename-application">
        <Input id="rename-application" name="name" defaultValue={application.name} required autoComplete="off" />
      </Field>
    ) : (
      <Field label={`Type ${application.name} to delete the application`} htmlFor="delete-application">
        <Input id="delete-application" name="confirmation" value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)} required autoComplete="off" spellCheck={false} />
      </Field>
    )}
    {!state.success && state.message && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      {mode === "rename" ? <SubmitButton pendingLabel="Saving…">Save name</SubmitButton>
        : <DeleteButton confirmed={confirmation === application.name} />}
    </div>
  </form>;
}

function NewApplicationForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useFormState(createApplication, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef, onDone);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <Field label="Name" htmlFor="app-name">
        <Input id="app-name" name="name" required autoComplete="off" placeholder="e.g. Freelance" />
      </Field>
      <SubmitButton pendingLabel="Creating…" className="w-full sm:w-auto sm:justify-self-end">
        Create application
      </SubmitButton>
    </form>
  );
}

export function ApplicationSwitcher({
  applications,
  activeId,
  variant = "sidebar",
}: {
  applications: ApplicationOption[];
  activeId: string | null;
  variant?: "sidebar" | "compact";
}) {
  const [pending, start] = useTransition();
  const [newOpen, setNewOpen] = useState(false);
  const [managing, setManaging] = useState<{ application: ApplicationOption; mode: "rename" | "delete" } | null>(null);
  const { showToast } = useToast();

  const active = applications.find((a) => a.id === activeId) ?? null;
  const label = activeId === UNASSIGNED_APPLICATION ? "Unassigned" : active?.name ?? "All applications";

  function switchTo(id: string | null) {
    if (id === activeId || pending) return;
    start(async () => {
      try {
        await setActiveApplication(id);
      } catch {
        showToast("Couldn't switch applications.", "error");
      }
    });
  }

  return (
    <>
      {/* modal={false}: same reason as LeadActions — lets the "new
          application" dialog open right after the menu closes. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {variant === "sidebar" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="w-full justify-between font-normal"
            >
              <span className="flex min-w-0 items-center gap-2"><ApplicationDot id={activeId} /><span className="truncate">{label}</span></span>
              <ChevronsUpDown className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
            </Button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="flex items-center gap-1 font-display text-xl"
              aria-label="Switch application"
            >
              <ApplicationDot id={activeId} /><span className="max-w-[9rem] truncate">{label}</span>
              <ChevronsUpDown className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onSelect={() => switchTo(null)}>
            <Check className={cn("mr-2 size-4", activeId !== null && "opacity-0")} aria-hidden="true" />
            All applications
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => switchTo(UNASSIGNED_APPLICATION)}>
            <Check className={cn("mr-2 size-4", activeId !== UNASSIGNED_APPLICATION && "opacity-0")} aria-hidden="true" />
            Unassigned
          </DropdownMenuItem>
          {applications.length > 0 && <DropdownMenuSeparator />}
          {applications.map((app) => (
            <DropdownMenuItem key={app.id} onSelect={() => switchTo(app.id)}>
              <Check className={cn("mr-2 size-4", activeId !== app.id && "opacity-0")} aria-hidden="true" />
              <ApplicationDot id={app.id} /><span className="ml-2 truncate">{app.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setNewOpen(true)}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            New application
          </DropdownMenuItem>
          {active && <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setManaging({ application: active, mode: "rename" })}>
              <Pencil className="mr-2 size-4" aria-hidden="true" />Rename application
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => setManaging({ application: active, mode: "delete" })}>
              <Trash2 className="mr-2 size-4" aria-hidden="true" />Delete application
            </DropdownMenuItem>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New application</DialogTitle>
            <DialogDescription>
              Keeps its own clients, projects, leads, and outreach separate from the rest.
            </DialogDescription>
          </DialogHeader>
          <NewApplicationForm onDone={() => setNewOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!managing} onOpenChange={(open) => { if (!open) setManaging(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{managing?.mode === "delete" ? "Are you sure you want to delete the application?" : "Rename application"}</DialogTitle>
            <DialogDescription>
              {managing?.mode === "delete"
                ? "The application will be permanently deleted. Its clients and leads will become Unassigned. Their projects, balances and email history will be kept."
                : "Update the name shown throughout Alfred."}
            </DialogDescription>
          </DialogHeader>
          {managing && <ManageApplicationForm key={`${managing.application.id}:${managing.mode}`}
            application={managing.application} mode={managing.mode} onDone={() => setManaging(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
