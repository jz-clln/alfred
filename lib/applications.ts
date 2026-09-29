import { cookies } from "next/headers";

// Stores an application ID or the "unassigned" scope; absence means all.
export const ACTIVE_APPLICATION_COOKIE = "alfred_active_application";

export function getActiveApplicationId(): string | null {
  return cookies().get(ACTIVE_APPLICATION_COOKIE)?.value || null;
}
