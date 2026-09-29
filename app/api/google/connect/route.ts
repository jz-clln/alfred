import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google/calendar";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectUri = new URL("/api/google/callback", request.url).toString();
  return NextResponse.redirect(getAuthUrl(redirectUri));
}