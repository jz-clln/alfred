export const APP_TIME_ZONE = "Asia/Manila";
export const PHILIPPINE_OFFSET_MS = 8 * 60 * 60 * 1000;

export function philippineDate(date = new Date()): string {
  return new Date(date.getTime() + PHILIPPINE_OFFSET_MS).toISOString().slice(0, 10);
}

// Philippine time is UTC+08:00, independent of the hosting server's timezone.
export function parsePhilippineDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const result = new Date(`${date}T${time}:00+08:00`);
  if (!Number.isFinite(result.getTime()) || philippineDate(result) !== date) return null;
  return result;
}

export function formatPhilippineDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}
