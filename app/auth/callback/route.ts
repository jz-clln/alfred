import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's own hosted callback (the .supabase.co/auth/v1/callback URL you
// registered in Google Cloud) handles the actual OAuth exchange with
// Google, then redirects here with a Supabase-issued `code`. This route
// turns that code into a real session (sets the auth cookies) before
// sending the browser on to the app.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}