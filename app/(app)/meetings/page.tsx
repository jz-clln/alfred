import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, listUpcomingEvents } from "@/lib/google/calendar";
import { ScheduleMeetingForm } from "./ScheduleMeetingForm";
import { formatPhilippineDateTime } from "@/lib/time";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";
import { PageTitle, Group, EmptyState } from "@/components/ui/kit";

export default async function MeetingsPage() {
  const supabase = createClient();
  const accessToken = await getValidAccessToken();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
  const events = accessToken ? await listUpcomingEvents(accessToken, 10) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Meetings"
        sub="All times are Philippine time."
        action={
          <a
            href={CALENDLY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tap shrink-0 rounded-full bg-fill px-3.5 py-1.5 text-sm text-ink-soft hover:text-ink"
          >
            Booking page
          </a>
        }
      />

      {!accessToken && (
        <div className="rounded-2xl bg-surface p-5">
          <p className="mb-4 text-ink-soft">Connect Google Calendar to see and schedule meetings here.</p>
          <a href="/api/google/connect" className="tap inline-block rounded-xl bg-moss px-5 py-2.5 text-sm font-medium text-white">
            Connect Google Calendar
          </a>
        </div>
      )}

      {accessToken && (
        <>
          <Group>
            {events.map((e) => (
              <li key={e.id} className="px-4 py-3.5">
                <div className="truncate">{e.summary ?? "Untitled event"}</div>
                <div className="text-sm text-ink-soft">
                  {e.start.dateTime ? formatPhilippineDateTime(e.start.dateTime) : e.start.date}
                </div>
              </li>
            ))}
            {!events.length && <EmptyState>Nothing on the calendar yet.</EmptyState>}
          </Group>

          <h2 className="mb-3 mt-10 text-lg">Schedule a meeting</h2>
          <ScheduleMeetingForm clients={clients ?? []} />
        </>
      )}
    </div>
  );
}
