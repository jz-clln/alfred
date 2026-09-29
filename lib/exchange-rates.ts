import { cache } from "react";
import { parseExchangeRate, type ExchangeRate } from "@/lib/money";

// Shared public data only. No client names, balances or credentials are sent.
export const getExchangeRate = cache(async (): Promise<ExchangeRate | null> => {
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/rate/php/usd", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    return parseExchangeRate(await response.json());
  } catch {
    return null;
  }
});
