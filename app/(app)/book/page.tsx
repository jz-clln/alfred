import { getValidAccessToken, getBusyPeriods } from "@/lib/google/calendar";
import { generateAvailableSlots } from "@/lib/google/slots";
import { bookMeeting } from "./actions";

// Without this, Next.js has no signal that this page depends on live data
// (it doesn't read cookies like the authenticated pages do) and will
// prerender it once at build time — meaning every visitor would see
// whatever slots happened to be open the moment you deployed, forever.
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-ink-soft">Booking isn&apos;t available right now — check back soon.</p>
      </main>
    );
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const busy = await getBusyPeriods(accessToken, now.toISOString(), in7Days.toISOString());
  const slots = generateAvailableSlots(busy, { days: 7 }).slice(0, 20);

  return (
    <main className="min-h-screen bg-paper px-6 py-16 text-ink">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 font-display text-3xl">Book a meeting</h1>
        <p className="mb-8 text-ink-soft">Pick a time that works for you.</p>

        {!slots.length && (
          <p className="text-sm text-ink-soft">
            No open slots in the next week — reach out directly instead.
          </p>
        )}

        {!!slots.length && (
          <form action={bookMeeting} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-ink-soft">Your name</label>
              <input
                name="name"
                required
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-moss"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-soft">Your email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-moss"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink-soft">Time slot</label>
              <select
                name="slot"
                required
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                {slots.map((s) => (
                  <option key={s.startISO} value={`${s.startISO}|${s.endISO}`}>
                    {new Date(s.startISO).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
            >
              Confirm booking
            </button>
          </form>
        )}
      </div>
    </main>
  );
}