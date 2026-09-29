import { redirect } from "next/navigation";
import { CALENDLY_BOOKING_URL } from "@/lib/booking";

export default function BookingConfirmedPage() {
  redirect(CALENDLY_BOOKING_URL);
}
