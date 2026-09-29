"use server";

import { redirect } from "next/navigation";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";

// Old open booking forms should continue to the current booking provider.
export async function bookMeeting(_formData: FormData) {
  redirect(CALENDLY_BOOKING_URL);
}
