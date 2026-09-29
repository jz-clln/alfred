interface BusyPeriod {
  start: string;
  end: string;
}

interface Slot {
  startISO: string;
  endISO: string;
}

interface SlotOptions {
  days?: number;
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
}

// Generates candidate meeting slots across the next `days` weekdays between
// startHour and endHour (in the server's local time zone), then filters out
// anything that overlaps a busy period or has already passed.
export function generateAvailableSlots(
  busy: BusyPeriod[],
  { days = 7, startHour = 9, endHour = 17, slotMinutes = 30 }: SlotOptions = {}
): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (let minutes = startHour * 60; minutes < endHour * 60; minutes += slotMinutes) {
      const start = new Date(day);
      start.setHours(0, minutes, 0, 0);
      const end = new Date(start.getTime() + slotMinutes * 60_000);

      if (start < now) continue;

      const overlapsBusy = busy.some(
        (b) => start < new Date(b.end) && end > new Date(b.start)
      );
      if (!overlapsBusy) {
        slots.push({ startISO: start.toISOString(), endISO: end.toISOString() });
      }
    }
  }

  return slots;
}