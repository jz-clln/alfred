import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google/calendar";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/meetings?error=missing_code", request.url));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectUri = new URL("/api/google/callback", request.url).toString();
  const tokens = await exchangeCodeForTokens(code, redirectUri);

  if (!tokens.refresh_token) {
    // Google only issues a refresh_token on first consent (or when
    // prompt=consent forces it, which getAuthUrl always sets) — if this
    // still comes back empty, something about the OAuth app config is off.
    return NextResponse.redirect(new URL("/meetings?error=no_refresh_token", request.url));
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.from("google_tokens").upsert({
    owner_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  });

  return NextResponse.redirect(new URL("/meetings?connected=1", request.url));
}