"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DISPLAY_CURRENCY_COOKIE, isCurrency } from "@/lib/money";

export async function setDisplayCurrency(currency: string) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user || !isCurrency(currency)) throw new Error("Unable to change display currency.");
  cookies().set(DISPLAY_CURRENCY_COOKIE, currency, {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}
