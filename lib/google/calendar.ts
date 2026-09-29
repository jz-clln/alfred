import { createAdminClient } from "@/lib/supabase/admin";
import { APP_TIME_ZONE } from "@/lib/time";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export function getAuthUrl(redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    // Forces Google to re-issue a refresh_token every time. Without this,
    // reconnecting after a disconnect can silently fail to return one.
    prompt: "consent",
    // CHANGED: gmail.readonly added, so Alfred can read replies from your leads
    // and clients. Space-separated. It cannot send, delete or change mail.
    scope:
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string; // CHANGED: the scopes you actually granted
  }>;
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

// Single-user app: there's only ever one row in google_tokens, so this
// always grabs the most recent one instead of filtering by owner_id.
// Refreshes and persists a new access token automatically when it's close
// to expiry. Returns null if Google Calendar has never been connected.
export async function getValidAccessToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("google_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  const isExpiringSoon = new Date(row.expires_at).getTime() - Date.now() < 60_000;
  if (!isExpiringSoon) return row.access_token;

  const refreshed = await refreshAccessToken(row.refresh_token);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from("google_tokens")
    .update({ access_token: refreshed.access_token, expires_at: expiresAt })
    .eq("owner_id", row.owner_id);

  return refreshed.access_token;
}

export async function listUpcomingEvents(accessToken: string, maxResults = 10) {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to list events: ${await res.text()}`);
  const data = await res.json();
  return (data.items ?? []) as GoogleEvent[];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    startISO: string;
    endISO: string;
    attendeeEmail?: string;
  }
) {
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startISO, timeZone: APP_TIME_ZONE },
      end: { dateTime: event.endISO, timeZone: APP_TIME_ZONE },
      attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Failed to create event: ${await res.text()}`);
  return res.json() as Promise<GoogleEvent>;
}

export async function getBusyPeriods(
  accessToken: string,
  timeMinISO: string,
  timeMaxISO: string
) {
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      items: [{ id: "primary" }],
    }),
  });
  if (!res.ok) throw new Error(`Failed to fetch free/busy: ${await res.text()}`);
  const data = await res.json();
  return (data.calendars?.primary?.busy ?? []) as { start: string; end: string }[];
}
