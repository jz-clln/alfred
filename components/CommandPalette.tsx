"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { NAV } from "@/components/SidebarNav";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

const OPEN_EVENT = "alfred:open-palette";

// Pages come from the shared NAV list, so the palette never drifts from the sidebar.
const PAGES = NAV.map(({ href, label }) => ({ href, label }));
const ACTIONS = [
  { href: "/outreach", label: "Write an email" },
  { href: "/outreach/sequences", label: "Follow-up sequences" },
];

type Item = { id: string; name: string };
type Data = { clients: Item[]; projects: Item[]; leads: Item[] };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open || data) return;
    let alive = true;
    const sb = createClient();
    Promise.all([
      sb.from("clients").select("id, name").order("name").limit(200),
      sb.from("projects").select("id, name").order("created_at", { ascending: false }).limit(200),
      sb.from("leads").select("id, name").order("created_at", { ascending: false }).limit(200),
    ])
      .then(([c, p, l]) => alive && setData({ clients: c.data ?? [], projects: p.data ?? [], leads: l.data ?? [] }))
      .catch(() => alive && setData({ clients: [], projects: [], leads: [] }));
    return () => {
      alive = false;
    };
  }, [open, data]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 md:p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Jump to a page, client, lead or project.</DialogDescription>
        <Command>
          <CommandInput placeholder="Search pages, clients, leads, projects…" />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup heading="Actions">
              {ACTIONS.map((a) => (
                <CommandItem key={a.href + a.label} value={a.label} onSelect={() => go(a.href)}>
                  {a.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Pages">
              {PAGES.map((p) => (
                <CommandItem key={p.href} value={`go to ${p.label}`} onSelect={() => go(p.href)}>
                  {p.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {!!data?.clients.length && (
              <CommandGroup heading="Clients">
                {data.clients.map((c) => (
                  <CommandItem key={c.id} value={`client ${c.name} ${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!!data?.leads.length && (
              <CommandGroup heading="Leads">
                {data.leads.map((l) => (
                  <CommandItem
                    key={l.id}
                    value={`lead ${l.name} ${l.id}`}
                    onSelect={() => go(`/leads?q=${encodeURIComponent(l.name)}`)}
                  >
                    {l.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!!data?.projects.length && (
              <CommandGroup heading="Projects">
                {data.projects.map((p) => (
                  <CommandItem key={p.id} value={`project ${p.name} ${p.id}`} onSelect={() => go(`/projects/${p.id}`)}>
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// "sidebar": full-width search bar with shortcut hint. "icon": phone header.
export function PaletteTrigger({ variant = "sidebar" }: { variant?: "sidebar" | "icon" }) {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setMod("⌘");
  }, []);
  const open = () => window.dispatchEvent(new Event(OPEN_EVENT));

  if (variant === "icon") {
    return (
      <Button type="button" variant="ghost" size="icon" aria-label="Search" onClick={open}>
        <Search aria-hidden="true" />
      </Button>
    );
  }
  // outline = white card surface, so it stands out on the tinted sidebar.
  return (
    <Button
      type="button"
      variant="outline"
      onClick={open}
      className="w-full justify-between font-normal text-muted-foreground"
    >
      <span className="flex items-center gap-2">
        <Search aria-hidden="true" />
        Search
      </span>
      <kbd className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{mod} K</kbd>
    </Button>
  );
}
