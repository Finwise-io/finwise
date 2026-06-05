// Currency & locale formatting — the single source of truth for how money is displayed.
// Global-ready: switching currency/locale reformats the whole app. Uses Intl.NumberFormat
// (full ICU on iOS Hermes) with a safe manual fallback so it never throws on a thin runtime.

export interface Currency {
  code: string;        // ISO 4217, e.g. 'USD'
  symbol: string;      // display symbol, e.g. '$'
  locale: string;      // BCP-47 for grouping/placement, e.g. 'en-US'
  name: string;
  flag: string;
  decimals: number;    // typical minor-unit digits (0 for JPY)
}

// Launch set — expands as we localize more regions (see roadmap Phase 3).
export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar', flag: '🇺🇸', decimals: 2 },
  { code: 'EUR', symbol: '€', locale: 'en-IE', name: 'Euro', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound', flag: '🇬🇧', decimals: 2 },
  { code: 'INR', symbol: '₹', locale: 'en-IN', name: 'Indian Rupee', flag: '🇮🇳', decimals: 2 },
  { code: 'CAD', symbol: '$', locale: 'en-CA', name: 'Canadian Dollar', flag: '🇨🇦', decimals: 2 },
  { code: 'AUD', symbol: '$', locale: 'en-AU', name: 'Australian Dollar', flag: '🇦🇺', decimals: 2 },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen', flag: '🇯🇵', decimals: 0 },
];

// module-level active format; set once on app load + whenever the user changes region.
let _code = 'USD';
let _locale = 'en-US';

export function setMoneyFormat(currency?: string | null, locale?: string | null) {
  if (currency) {
    _code = currency;
    const c = CURRENCIES.find((x) => x.code === currency);
    _locale = locale || c?.locale || 'en-US';
  } else if (locale) {
    _locale = locale;
  }
}

export function activeCurrency(): Currency {
  return CURRENCIES.find((c) => c.code === _code) ?? CURRENCIES[0];
}
export function currencySymbol(): string {
  return activeCurrency().symbol;
}

// Full amount, no minor units (matches the app's whole-number money style), locale-grouped.
// e.g. USD 2460137 → "$2,460,137" · INR → "₹24,60,137" · EUR (en-IE) → "€2,460,137".
export function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  try {
    return new Intl.NumberFormat(_locale, { style: 'currency', currency: _code, maximumFractionDigits: 0 }).format(v);
  } catch {
    const neg = v < 0 ? '-' : '';
    return neg + currencySymbol() + Math.abs(v).toLocaleString();
  }
}

// Compact form for tight spaces (chart labels, donut center). Manual K/M/MM so it works on any
// runtime and honors the symbol; placement is symbol-first (refine per-locale in Phase 3).
export function moneyCompact(n: number, style: 'M' | 'MM' = 'MM'): string {
  const s = currencySymbol();
  const neg = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e6) return `${neg}${s}${(a / 1e6).toFixed(2).replace(/\.?0+$/, '')}${style}`;
  if (a >= 1e3) return `${neg}${s}${Math.round(a / 1e3)}K`;
  return `${neg}${s}${Math.round(a)}`;
}
