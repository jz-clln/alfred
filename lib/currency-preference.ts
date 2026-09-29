import { cookies } from "next/headers";
import { DISPLAY_CURRENCY_COOKIE, isCurrency, type Currency } from "@/lib/money";

export function getDisplayCurrency(): Currency {
  const value = cookies().get(DISPLAY_CURRENCY_COOKIE)?.value;
  return isCurrency(value) ? value : "PHP";
}
