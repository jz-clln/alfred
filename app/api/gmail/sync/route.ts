import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncReplies, isReconnectError } from "@/lib/gmail/sync";

export const dynamic = "force-dynamic";

// Called by the "Check for replies" button and by the watcher while Alfred
// is open. /api is public in middleware, so this checks the session itself.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  try {
    const result = await syncReplies(supabase, user.id);
    if (result.added || result.bounces) {
      for (const p of ["/replies", "/leads", "/dashboard", "/insights"]) revalidatePath(p);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const reconnect = isReconnectError(e);
    const message = e instanceof Error ? e.message : "Couldn't check for replies.";
    return NextResponse.json(
      { ok: false, reconnect, error: reconnect ? "Reconnect Google to read replies." : message },
      { status: reconnect ? 409 : 500 }
    );
  }
}
