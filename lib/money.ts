export type Currency = "PHP" | "USD";
export const DISPLAY_CURRENCY_COOKIE = "alfred_display_currency";

export function isCurrency(value: unknown): value is Currency {
  return value === "PHP" || value === "USD";
}

// Existing clients and entries predate currency support and were recorded in USD.
export function ledgerCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : "USD";
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency, currencyDisplay: "symbol",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

export interface ExchangeRate {
  date: string;
  base: "PHP";
  quote: "USD";
  rate: number;
}

export function parseExchangeRate(value: unknown): ExchangeRate | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.base !== "PHP" || data.quote !== "USD" ||
      typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0 ||
      typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
  return { base: "PHP", quote: "USD", rate: data.rate, date: data.date };
}

// No intermediate rounding: round only when displaying the converted amount.
export function convertMoney(amount: number, from: Currency, to: Currency, rate: ExchangeRate | null): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to || amount === 0) return amount;
  if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) return null;
  const converted = from === "PHP" ? amount * rate.rate : amount / rate.rate;
  return Number.isFinite(converted) ? converted : null;
}

export function moneyLabel(amount: number, from: Currency, to: Currency, rate: ExchangeRate | null): string {
  const converted = convertMoney(amount, from, to, rate);
  if (converted === null) return formatMoney(amount, from);
  return `${from !== to && amount !== 0 ? "≈ " : ""}${formatMoney(converted, to)}`;
}

export function sumMoney(rows: { amount: number; currency: Currency }[], to: Currency, rate: ExchangeRate | null): number | null {
  let total = 0;
  for (const row of rows) {
    const converted = convertMoney(row.amount, row.currency, to, rate);
    if (converted === null) return null;
    total += converted;
  }
  return total;
}
