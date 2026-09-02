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

/* ─ MK-ST-F-044 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setMoneyFormat
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     c = CURRENCIES.find((x) => code = currency)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-044
 * Changed ..... 2026-06-26 (35008ef)
 */
export function setMoneyFormat(currency?: string | null, locale?: string | null) {
  if (currency) {
    _code = currency;
    const c = CURRENCIES.find((x) => x.code === currency);
    _locale = locale || c?.locale || 'en-US';
  } else if (locale) {
    _locale = locale;
  }
}

// Hide-balances (privacy): the ONE place display masking lives, so every formatted amount across the app
// becomes •••• when on. Module-level (like _code/_locale) + synced from the store in app/_layout.tsx, which
// also remounts the tree on toggle so all money() call sites re-run. Pure MATH (round2, etc.) is unaffected.
export const BALANCE_MASK = '••••';
/** What a figure we could not compute looks like — never a "$0" that reads as a real balance. */
export const NOT_A_NUMBER = '—';
let _hide = false;
/* ─ MK-ST-F-045 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setHideBalances
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-045
 * Changed ..... 2026-06-26 (35008ef)
 */
export function setHideBalances(b: boolean) { _hide = !!b; }
/* ─ MK-ST-F-046 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * balancesHidden
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-046
 * Changed ..... 2026-06-26 (35008ef)
 */
export function balancesHidden(): boolean { return _hide; }

/* ─ MK-ST-F-047 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * activeCurrency
 *
 * Answers ..... Which currency is the app showing?
 *
 * Formula .....
 *     the first of CURRENCIES.find((c) => code = code) (or CURRENCIES when missing)
 *
 * Called by ... MK-ST-F-048 currencySymbol
 *
 * Reaches ..... 17 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-PF-F-013 benchmarkTicker
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-PF-F-014 buildPerformance · MK-ST-F-048 currencySymbol
 *               MK-CF-F-171 earnerPay · MK-ST-F-049 formatMoney
 *               MK-ST-F-050 formatMoneyCents · MK-CF-F-184 incomeFromAccounts
 *               MK-CF-O-004 incomeSummary · MK-ST-F-053 money
 *               MK-ST-F-054 money2 · MK-ST-F-051 moneyCompact
 *               MK-PL-F-030 onCourseSentence · MK-CF-F-146 payFiguresAgree
 *               MK-ST-F-044 setMoneyFormat
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-047
 * Changed ..... 2026-06-26 (35008ef)
 */
export function activeCurrency(): Currency {
  return CURRENCIES.find((c) => c.code === _code) ?? CURRENCIES[0];
}
/* ─ MK-ST-F-048 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * currencySymbol
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     active currency().symbol
 *
 * Called by ... MK-ST-F-049 formatMoney · MK-ST-F-050 formatMoneyCents
 *               MK-ST-F-051 moneyCompact
 *
 * Reaches ..... 16 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-PF-F-013 benchmarkTicker
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-PF-F-014 buildPerformance · MK-CF-F-171 earnerPay
 *               MK-ST-F-049 formatMoney · MK-ST-F-050 formatMoneyCents
 *               MK-CF-F-184 incomeFromAccounts · MK-CF-O-004 incomeSummary
 *               MK-ST-F-053 money · MK-ST-F-054 money2
 *               MK-ST-F-051 moneyCompact · MK-PL-F-030 onCourseSentence
 *               MK-CF-F-146 payFiguresAgree · MK-ST-F-044 setMoneyFormat
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-048
 * Changed ..... 2026-08-10 (e37d50e)
 */
export function currencySymbol(): string {
  return activeCurrency().symbol;
}

// Full amount, no minor units (matches the app's whole-number money style), locale-grouped.
// e.g. USD 2460137 → "$2,460,137" · INR → "₹24,60,137" · EUR (en-IE) → "€2,460,137".
/* ─ MK-ST-F-049 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * formatMoney
 *
 * Answers ..... Full amount, no minor units (matches the app's whole-number money style), locale-grouped.
 *
 * Formula .....
 *     BALANCE_MASK   when hide
 *     NOT_A_NUMBER   when !number.is finite(n)
 *     v = round(n)
 *     the answer = new intl.number format(locale, { style: 'currency', currency: code, maximum fraction digits: 0 }).format(v)
 *     neg = '-'   if v < 0
 *     ''   otherwise
 *
 * Called by ... MK-ST-F-053 money
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-PF-F-013 benchmarkTicker
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-PF-F-014 buildPerformance · MK-CF-F-171 earnerPay
 *               MK-CF-F-184 incomeFromAccounts · MK-CF-O-004 incomeSummary
 *               MK-ST-F-053 money · MK-PL-F-030 onCourseSentence
 *               MK-CF-F-146 payFiguresAgree · MK-ST-F-044 setMoneyFormat
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-049
 * Changed ..... 2026-08-10 (e37d50e)
 */
export function formatMoney(n: number): string {
  if (_hide) return BALANCE_MASK;
  // A number we could not compute must never print as a real "$0" (founder's B45 rule: never show an
  // invented figure). NaN/Infinity reads as an em dash, which is visibly not a balance.
  if (!Number.isFinite(n)) return NOT_A_NUMBER;
  const v = Math.round(n);
  try {
    return new Intl.NumberFormat(_locale, { style: 'currency', currency: _code, maximumFractionDigits: 0 }).format(v);
  } catch {
    const neg = v < 0 ? '-' : '';
    return neg + currencySymbol() + Math.abs(v).toLocaleString();
  }
}

// Same as formatMoney but keeps 2 decimal places — for precise amounts (transactions, holdings,
// recurring lines). Also masks to •••• when hide-balances is on, so cents displays don't leak.
/* ─ MK-ST-F-050 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * formatMoneyCents
 *
 * Answers ..... Same as formatMoney but keeps 2 decimal places — for precise amounts (transactions, holdings, recurring lines).
 *
 * Formula .....
 *     BALANCE_MASK   when hide
 *     NOT_A_NUMBER   when !number.is finite(n)
 *     v = n
 *     the answer = new intl.number format(locale, { style: 'currency', currency: code, minimum fraction digits: 2, maximum fraction digits: 2 }).format(v)
 *     neg = '-'   if v < 0
 *     ''   otherwise
 *
 * Called by ... MK-ST-F-054 money2
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-ST-F-054 money2
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-050
 * Changed ..... 2026-08-10 (e37d50e)
 */
export function formatMoneyCents(n: number): string {
  if (_hide) return BALANCE_MASK;
  if (!Number.isFinite(n)) return NOT_A_NUMBER;
  const v = n;
  try {
    return new Intl.NumberFormat(_locale, { style: 'currency', currency: _code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  } catch {
    const neg = v < 0 ? '-' : '';
    return neg + currencySymbol() + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// Compact form for tight spaces (chart labels, donut center). Manual K/M/MM so it works on any
// runtime and honors the symbol; placement is symbol-first (refine per-locale in Phase 3).
/* ─ MK-ST-F-051 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * moneyCompact
 *
 * Answers ..... Compact form for tight spaces (chart labels, donut center).
 *
 * Formula .....
 *     BALANCE_MASK   when hide
 *     s = currency symbol()
 *     neg = '-'   if n < 0
 *     ''   otherwise
 *     a = size of(n)
 *     `${neg}${s}${(a ÷ 1e6).to fixed(2).replace( ÷ \.?0+$ ÷ , '')}${style}`   when a ≥ 1e6
 *     `${neg}${s}${math.round(a ÷ 1e3)}K`   when a ≥ 1e3
 *     the answer = `${neg}${s}${math.round(a)}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-051
 * Changed ..... 2026-06-26 (35008ef)
 */
export function moneyCompact(n: number, style: 'M' | 'MM' = 'MM'): string {
  if (_hide) return BALANCE_MASK;
  const s = currencySymbol();
  const neg = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e6) return `${neg}${s}${(a / 1e6).toFixed(2).replace(/\.?0+$/, '')}${style}`;
  if (a >= 1e3) return `${neg}${s}${Math.round(a / 1e3)}K`;
  return `${neg}${s}${Math.round(a)}`;
}
