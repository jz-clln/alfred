import { PHILIPPINE_OFFSET_MS, philippineDate } from "../time";

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
// startHour and endHour (in Philippine time), then filters out
// anything that overlaps a busy period or has already passed.
export function generateAvailableSlots(
  busy: BusyPeriod[],
  { days = 7, startHour = 9, endHour = 17, slotMinutes = 30 }: SlotOptions = {}
): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();
  const today = new Date(`${philippineDate(now)}T00:00:00Z`);

  for (let d = 0; d < days; d++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + d);
    const dayOfWeek = day.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (let minutes = startHour * 60; minutes < endHour * 60; minutes += slotMinutes) {
      const start = new Date(day.getTime() + minutes * 60_000 - PHILIPPINE_OFFSET_MS);
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
