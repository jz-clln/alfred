import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. This uses the Supabase service role key, which bypasses
// row-level security entirely. Never import this into a Client Component
// or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
//
// It exists for exactly one reason: the public /book page lets a client
// create a meeting without being signed in as you, so that one insert has
// to go around the owner-scoped RLS policies on purpose.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}