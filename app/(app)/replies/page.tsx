import { redirect } from "next/navigation";

// Replies now live inside Outreach. Old links and bookmarks land there.
export default function RepliesMoved({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const p = new URLSearchParams({ tab: "replies" });
  for (const k of ["gmail", "connected"]) if (searchParams[k]) p.set(k, searchParams[k]!);
  if (searchParams.t === "unread") p.set("f", "unread");
  redirect(`/outreach?${p.toString()}`);
}
