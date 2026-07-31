import type { PriceRange } from "./types";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  exchangeRate: number; // relative to PHP base
  surchargePercent?: number; // e.g. transfer-fee markup, only needed for non-PHP
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  PHP: { code: "PHP", symbol: "₱", exchangeRate: 1 },
};

function convert(amount: number, config: CurrencyConfig): number {
  const converted = amount * config.exchangeRate;
  const surcharge = config.surchargePercent ? converted * config.surchargePercent : 0;
  return converted + surcharge;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const config = CURRENCIES[currencyCode];
  if (!config) {
    throw new Error(`Unknown currency code: ${currencyCode}`);
  }
  const converted = convert(amount, config);
  return `${config.symbol}${new Intl.NumberFormat("en-US").format(converted)}`;
}

export function formatCurrencyRange(range: PriceRange, currencyCode: string): string {
  return `${formatCurrency(range.min, currencyCode)}–${formatCurrency(range.max, currencyCode)}`;
}
