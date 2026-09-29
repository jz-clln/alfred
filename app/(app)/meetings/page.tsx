import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, listUpcomingEvents } from "@/lib/google/calendar";
import { scheduleMeeting } from "./actions";

export default async function MeetingsPage() {
  const supabase = createClient();
  const accessToken = await getValidAccessToken();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  const events = accessToken ? await listUpcomingEvents(accessToken, 10) : [];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 text-3xl font-medium">Meetings</h1>

      {!accessToken && (
        <div className="mb-8 rounded-lg border border-line bg-surface p-5">
          <p className="mb-3 text-sm text-ink-soft">
            Connect your Google Calendar to see and schedule meetings here.
          </p>
          <a
            href="/api/google/connect"
            className="inline-block rounded-md bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
          >
            Connect Google Calendar
          </a>
        </div>
      )}

      {accessToken && (
        <>
          <div className="mb-8 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-ink-soft">
                  <th className="px-4 py-3 font-normal">When</th>
                  <th className="px-4 py-3 font-normal">Event</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink-soft">
                      {e.start.dateTime
                        ? new Date(e.start.dateTime).toLocaleString()
                        : e.start.date}
                    </td>
                    <td className="px-4 py-3">{e.summary ?? "(no title)"}</td>
                  </tr>
                ))}
                {!events.length && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-ink-soft">
                      Nothing on the calendar yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mb-2 text-sm text-ink-soft">Schedule a meeting</h2>
          <form action={scheduleMeeting} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-ink-soft">Client</label>
              <select
                name="client_id"
                required
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-ink-soft">Title</label>
              <input
                name="title"
                required
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">Date</label>
              <input
                name="date"
                type="date"
                required
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">Time</label>
              <input
                name="time"
                type="time"
                required
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">Minutes</label>
              <input
                name="duration"
                type="number"
                defaultValue={30}
                min={15}
                step={15}
                className="w-20 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
            >
              Schedule
            </button>
          </form>

          <p className="mt-8 text-xs text-ink-soft">
            Public booking link:{" "}
            <span className="font-medium text-ink">
              {process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/book
            </span>
          </p>
        </>
      )}
    </div>
  );
}