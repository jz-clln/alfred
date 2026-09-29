import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, listUpcomingEvents } from "@/lib/google/calendar";
import { ScheduleMeetingForm } from "./ScheduleMeetingForm";
import { formatPhilippineDateTime } from "@/lib/time";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";
import { PageTitle, Group, EmptyState } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";

export default async function MeetingsPage() {
  const supabase = createClient();
  const accessToken = await getValidAccessToken();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
  const events = accessToken ? await listUpcomingEvents(accessToken, 10) : [];

  return (
    <div className="max-w-3xl">
      <PageTitle
        title="Meetings"
        sub="All times are Philippine time."
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="pill" size="pill">
              <a href={CALENDLY_BOOKING_URL} target="_blank" rel="noopener noreferrer">Booking page</a>
            </Button>
            {accessToken && (
              <FormDialog triggerLabel="Schedule" title="Schedule a meeting" wide>
                <ScheduleMeetingForm clients={clients ?? []} />
              </FormDialog>
            )}
          </div>
        }
      />

      {!accessToken && (
        <div className="rounded-2xl bg-surface p-5">
          <p className="mb-4 text-ink-soft">Connect Google Calendar to see and schedule meetings here.</p>
          <Button asChild>
            <a href="/api/google/connect">Connect Google Calendar</a>
          </Button>
        </div>
      )}

      {accessToken && (
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
      )}
    </div>
  );
}
