//components\Money.tsx

import { formatMoney, moneyLabel, type Currency, type ExchangeRate } from "@/lib/money";

export function Money({ amount, currency, displayCurrency, rate }: {
  amount: number; currency: Currency; displayCurrency: Currency; rate: ExchangeRate | null;
}) {
  return <span>
    <span>{moneyLabel(amount, currency, displayCurrency, rate)}</span>
    {currency !== displayCurrency && amount !== 0 && <span className="block text-xs font-normal text-ink-soft">
      {rate ? `${formatMoney(amount, currency)} original` : "Conversion unavailable"}
    </span>}
  </span>;
}

export function ExchangeRateNote({ rate }: { rate: ExchangeRate | null }) {
  return <p className="text-xs text-ink-soft">
    {rate
      ? <>≈ Estimated conversion · Frankfurter rate dated {rate.date}. Ledger amounts stay in their original currency. <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer" className="underline">Rate source</a></>
      : "Conversion is unavailable. Original currencies are shown; mixed-currency totals are hidden."}
  </p>;
}
