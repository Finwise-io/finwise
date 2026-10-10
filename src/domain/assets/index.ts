// Asset Ledger module (spec service 2). Owns `assets/{uid}`.
// Tracks balances + tax bucket + target return; provides total value & allocation.
import type { UserId, EntityId } from '../_shared/ids';
import { nameEvidence } from '../../../Calculation Module code/engines/holding-class';
import { newEntityId } from '../_shared/ids';
import { toNum, rentFigure } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import { employerMatchMonthly } from '../income/onboarding';
import { annual401kLimit, ageAttainedInYear } from '../income/limits';
import { ageLabel, isStale } from '../_shared/freshness';

export type TaxBucket = 'CASH' | 'PRE_TAX' | 'ROTH' | 'TAXABLE' | 'PROPERTY';

// ── Two-axis classification (taxonomy spec, Term #1) ──────────────────────────
// `assetClass` = WHAT it is; `taxTreatment` = HOW it's taxed. Orthogonal — a 401(k) (tax_deferred)
// can hold stocks AND bonds. Both are DERIVED from the legacy `kind`/`tax_bucket` until set
// explicitly (by the CSV importer or the account editor). See assetClassOf()/taxTreatmentOf().
export type AssetClass = 'cash' | 'bonds' | 'stocks_etf' | 'alternatives' | 'real_estate' | 'personal_property' | 'mixed';

/** THE canonical user-facing label for each asset class — one name, used on every surface (the Net
 *  Worth donut, onboarding, anywhere a class is named). Standard finance terms: real property = "Real
 *  estate", movable possessions = "Personal property" (not the colloquial "belongings"). Naming
 *  consistency is part of the taxonomy: same concept → same WORD, like same concept → same number. */
export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  cash: 'Cash',
  bonds: 'Bonds & CDs',   // pre-48 audit A7: every approved mock names the class with its CDs
  stocks_etf: 'Stocks / Funds',
  alternatives: 'Alternatives',
  real_estate: 'Real estate',
  personal_property: 'Personal property',
  mixed: 'Unclassified',
};
export type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free';
export type RealEstateUse = 'primary' | 'rental' | 'secondary' | 'land';

export interface AssetAccount {
  asset_id: EntityId;
  label: string;                  // account name, e.g. "Chase Checking"
  institution?: string;           // e.g. "Chase", "Fidelity"
  kind?: string;                  // ASSET_KINDS id, e.g. 'checking','brokerage','401k','home'
  tax_bucket: TaxBucket;
  balance: number;
  target_return: number;          // annual, decimal (e.g. 0.07)
  change_amount?: number;         // net change this month (from savings allocations)
  change_month?: string;          // 'YYYY-MM' the change applies to
  retirement_pct?: number | null; // 0–100 earmark; null/absent = use earmarkDefault (the auto share)
                                  // (rest is for other goals); defaults per kind via earmarkDefault()
  actual_ttm?: number;            // user-reported ACTUAL trailing-12-month return (decimal), for
                                  // performance-vs-benchmark; null/undefined = not reported
  positions?: import('../performance').Position[];  // ticker holdings (lots) tracked for performance.
                                  // For a manual-balance account these are a SUBSET tracked for
                                  // performance only — they do NOT change `balance`. The account's
                                  // value is derived from positions ONLY when derive_balance is true.
  derive_balance?: boolean;       // true → balance = cash_balance + Σ(position market value), refreshed
                                  // from live prices (a fully position-tracked brokerage built from its
                                  // holdings). Absent/false → `balance` is the user-entered total and
                                  // positions are partial performance trackers (never overwrite balance).
  cash_balance?: number;          // uninvested cash sleeve in an investment account (a brokerage isn't 100%
                                  // invested). Account value = cash_balance + Σ(position market value).
  // Individual bond fields (Phase B) — present → this account is a bond; balance = current value.
  face_value?: number;            // par/face value (total)
  coupon_rate?: number;           // annual coupon, decimal (e.g. 0.045)
  maturity_date?: string;         // 'YYYY-MM-DD'
  accrued_interest?: number;      // A47 (founder, 2026-08-26): interest earned since the last coupon, when the person knows it — subtracted before the yield
  origin?: 'onboarding';          // seeded from onboarding answers; re-seeding replaces ONLY these
                                  // rows (absent = user-created, never touched by seeding/restart)
  // Two-axis classification (taxonomy spec). Optional + EXPLICIT — when absent, derived from
  // kind/tax_bucket via assetClassOf()/taxTreatmentOf(). The CSV importer + editor set these directly.
  asset_class?: AssetClass;
  tax_treatment?: TaxTreatment;
  re_use?: RealEstateUse;         // real_estate only: primary | rental | secondary | land
  // FCC F1 provenance + manual-value freshness (detailed design v1.1, Net worth sheet):
  source?: 'connected' | 'imported' | 'manual';  // absent = manual (every pre-FCC row)
  connection_id?: string;         // F1: which Connection feeds this account (connected only)
  last_synced?: string;           // ISO — last successful update from its source
  mask?: string;                  // '••4821' — how banks disambiguate accounts
  status?: 'open' | 'closed' | 'archived' | 'unavailable';   // broker-reported; closed is SHOWN, never dropped
  wrapper_confirmed?: boolean;    // the USER confirmed kind/tax_bucket — syncs never override it
  // the PERSON chose this account's class in the Net worth editor — the class sweep never changes it
  // (the same word a holding carries; outside review OpenAI final, 2026-10-09, DEC-2748h)
  class_source?: 'user';
  snaptrade_account_id?: string;  // stable SnapTrade account id — how syncs find an absorbed manual row
  option_holdings?: {             // SnapTrade v2 (G2): itemized option positions on a connected
    label: string;                // account — 'AAPL $220 call · exp Jan 16 2027'. Their value is
    contracts: number;            // already inside `balance` (the broker's total), so these rows
    value: number;                // are DISPLAY detail, never added again to any total.
    cost_basis?: number | null;
  }[];
  value_as_of?: string;           // 'YYYY-MM-DD' — when a HAND-ENTERED value was last set/confirmed
                                  // (display honesty only; the balance stays the one stored number)
  // FOUNDER RULE 2026-08-04 (the fifth ingredient check): brokers back-fill DIFFERENT depths of
  // activity history — one sends a year, the next 90 days. Without knowing the depth, a "past year"
  // income figure silently understates. Set to the EARLIEST activity date the source has ever
  // supplied for this account; year-scale income figures label themselves with it.
  history_from?: string;          // 'YYYY-MM-DD' — earliest activity row this source has provided
  recon_break?: { difference: string; at: string };   // E11 assertion 1: holdings+cash ≠ the broker's stated total — the EXACT difference, kept and shown, never absorbed by a tolerance
}

/** How many whole months old is a value typed by hand, and is that old enough to ask about it?
 *  MONTHS THAT HAVE FULLY PASSED, not month names crossed (outside review, 2026-10-05): a value set on
 *  30 April is five months old on 1 October, and used to read six — so "still right?" came up to a
 *  month early. A month has passed once the same day of the month comes round, or the month ends
 *  first (31 January is a month old on the last day of February). Six or more is old enough to ask.
 *  No answer for a balance built from its holdings, or a value with no date. */
/* ─ MK-NW-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * valueFreshness
 *
 * Answers ..... How many whole months old is a value typed by hand, and is that old enough to ask about it?
 *
 * Formula .....
 *     nothing   when derive balance
 *     nothing   when value as of is missing
 *     m = value as of.match( ÷ ^(\d{4}) − (\d{2})(?:-(\d{2}))? ÷ )
 *     nothing   when m is missing
 *     crossed = (now.get full year() - +m[1]) × 12 + (now.get month() + 1 - +m[2])
 *     set on = +m[3]   if m[3]
 *     1   otherwise
 *     last day this month = the date now.get full year(), now.get month() + 1, 0).get date(
 *     reached = now.get date() ≥ set on (or now.get date() = last day this month when missing or zero)
 *     months old = max(0, crossed − (reached ? 0 : 1))
 *     the answer:
 *     as of = value as of   if m[3]
 *     `${m[1]}-${m[2]}-01`   otherwise
 *     months old = months old
 *     stale = months old ≥ 6
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-033 the date a hand-typed value was set
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-003
 * Changed ..... 2026-07-13 (04777bc)
 */
export function valueFreshness(a: AssetAccount, now: Date = new Date()): { asOf: string; monthsOld: number; stale: boolean } | null {
  if (a.derive_balance) return null;                       // live-priced from positions
  if (!a.value_as_of) return null;
  const m = a.value_as_of.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return null;
  const crossed = (now.getFullYear() - +m[1]) * 12 + (now.getMonth() + 1 - +m[2]);
  // the month now running has not finished unless today has reached the day the value was set on —
  // or today is the last day of a month too short to hold that day
  const setOn = m[3] ? +m[3] : 1;
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const reached = now.getDate() >= setOn || now.getDate() === lastDayThisMonth;
  const monthsOld = Math.max(0, crossed - (reached ? 0 : 1));
  // a value dated by its month alone is counted from the 1st, and said so (outside review, 2026-10-07)
  return { asOf: m[3] ? a.value_as_of : `${m[1]}-${m[2]}-01`, monthsOld, stale: monthsOld >= 6 };
}

/** What the money set aside for retirement returned over the last twelve months, from the returns the person reported.
 *  NOT the return of everything invested: the plan grows the retirement money and nothing else, so
 *  each account weighs what it has set aside for retirement, the same weights the plan's benchmark
 *  (MK-NW-F-037 blendedReturn) uses — the two are compared, so they must be built alike. An account
 *  with nothing set aside for retirement is not in it; a reported return of exactly 0 counts; an
 *  account with no return reported is left out, never read as 0. No answer when none is reported. */
/* ─ MK-NW-F-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * portfolioActualReturn
 *
 * Answers ..... What the money set aside for retirement returned over the last twelve months, from the returns the person reported.
 *
 * Formula .....
 *     items = accounts (or none when missing) where tax bucket ! = 'PROPERTY' and actual ttm ≠ nothing and earmarked amount(each) > 0 and (actual ttm as number) > -1
 *     now = Σ over items of (earmarked amount(each))
 *     start = Σ over items of (earmarked amount(each) ÷ (1 + (actual ttm as number)))
 *     nothing   when now ≤ 0 (or start ≤ 0 when missing or zero)
 *     the answer = now ÷ start − 1
 *
 * Called by ... MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-051 what an account actually returned over the last twelve months
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-004
 * Changed ..... 2026-06-05 (1e6bbe9)
 */
export function portfolioActualReturn(accounts: AssetAccount[]): number | null {
  const items = (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY' && a.actual_ttm != null && earmarkedAmount(a) > 0 && (a.actual_ttm as number) > -1);
  // WEIGHED BY WHAT WAS SET ASIDE WHEN THE TWELVE MONTHS BEGAN (outside review, 2026-10-07): each
  // account's start = what is set aside today ÷ (1 + its return), and the answer is what the money set
  // aside grew by — Σ now ÷ Σ start − 1. Weighing by today's amounts counted the account that grew most
  // twice over: +13.72% where the money set aside grew +12.98%. Still the retirement money's return,
  // weighed by the money set aside (his approval, DEC-2484).
  const now = items.reduce((t, a) => t + earmarkedAmount(a), 0);
  const start = items.reduce((t, a) => t + earmarkedAmount(a) / (1 + (a.actual_ttm as number)), 0);
  if (now <= 0 || start <= 0) return null;
  return ((now / start - 1));
}

/** Can a share or fund bought by its ticker be recorded in this account?
 *  No for cash, property and a 529 (it holds the plan's own portfolios). No for an account that IS
 *  one bond, CD or alternative holding typed by hand. Yes for any other — and yes for an account that
 *  already lists holdings, whatever its class: a fixed-income brokerage holding bond funds plainly
 *  holds tickers (outside review, 2026-10-05). */
/* ─ MK-NW-F-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountAllowsTicker
 *
 * Answers ..... Can a share or fund bought by its ticker be recorded in this account?
 *
 * Formula .....
 *     false   when tax bucket = 'PROPERTY' (or tax bucket = 'CASH' when missing or zero)
 *     false   when kind = 'college_529'
 *     false   when kind = 'checking' (or kind = 'savings' when missing or zero)
 *     true   when (positions.length ?? 0) > 0
 *     cls = asset class of(a)
 *     false   when cls = 'bonds' (or cls = 'alternatives' when missing or zero)
 *     the answer = true
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If length is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-005
 * Changed ..... 2026-06-28 (76c2bf0)
 */
export function accountAllowsTicker(a: AssetAccount): boolean {
  if (a.tax_bucket === 'PROPERTY' || a.tax_bucket === 'CASH') return false;
  if (a.kind === 'college_529') return false;
  if (a.kind === 'checking' || a.kind === 'savings') return false;
  // A dedicated bond or alternative (crypto/options/commodities/…) account holds THOSE instruments, not
  // equity tickers — so it must not appear as a stock-trading target on the Stocks/ETFs screen.
  if ((a.positions?.length ?? 0) > 0) return true;
  const cls = assetClassOf(a);
  if (cls === 'bonds' || cls === 'alternatives') return false;
  return true;
}

// Capture types for assets. `section` groups them on the Net Worth screen.
// `ret` = benchmark annual return (nominal). Where a clean 30-yr index series exists it's the real
// historical figure (see BENCHMARK_META for source/period); otherwise it's a flagged estimate.
export const ASSET_KINDS: { id: string; label: string; icon: string; bucket: TaxBucket; section: string; ret: number }[] = [
  // Cash & cash-equivalents (all CASH bucket, class = cash)
  { id: 'checking', label: 'Checking', icon: '💵', bucket: 'CASH', section: 'Cash', ret: 0.005 },
  { id: 'savings', label: 'Savings', icon: '🏦', bucket: 'CASH', section: 'Cash', ret: 0.024 },
  { id: 'hysa', label: 'High-yield savings', icon: '💰', bucket: 'CASH', section: 'Cash', ret: 0.042 },
  // a money-market fund sits with Investments, in Stocks / Funds — his rule DEC-0051; the same fix as a CD
  { id: 'money_market', label: 'Money market', icon: '🏧', bucket: 'TAXABLE', section: 'Investments', ret: 0.045 },
  // A CD SITS WITH INVESTMENTS, in Bonds & CDs — his rule DEC-0051 (2026-08-04: CDs are Bonds & CDs at any
  // maturity). It was listed as a cash kind, so one CD sat under Cash on one total and Investments on
  // another (batch 06 fix brief, 2026-10-08). How soon it can be spent is its liquidity, not its class.
  { id: 'cd', label: 'CD', icon: '📑', bucket: 'TAXABLE', section: 'Investments', ret: 0.042 },
  { id: 'cash_mgmt', label: 'Cash management', icon: '💳', bucket: 'CASH', section: 'Cash', ret: 0.035 },
  // Q08 (founder, 2026-08-26): a foreign currency is cash held in that currency — no interest, no
  // dividend, no growth. Entered as what it is worth in dollars today (no exchange-rate feed: Q43).
  { id: 'foreign_currency', label: 'Foreign currency', icon: '💱', bucket: 'CASH', section: 'Cash', ret: 0 },
  // Investments (taxable) — common first, then alternatives, then specialty
  { id: 'brokerage', label: 'Brokerage', icon: '📊', bucket: 'TAXABLE', section: 'Investments', ret: 0.08 },
  { id: 'stocks_etf', label: 'Stocks / Funds', icon: '📈', bucket: 'TAXABLE', section: 'Investments', ret: 0.104 },
  { id: 'fixed_income', label: 'Fixed income', icon: '📜', bucket: 'TAXABLE', section: 'Investments', ret: 0.042 },
  { id: 'crypto', label: 'Crypto', icon: '🪙', bucket: 'TAXABLE', section: 'Investments', ret: 0.08 },
  { id: 'private_equity', label: 'Private equity', icon: '🏢', bucket: 'TAXABLE', section: 'Investments', ret: 0.13 },
  { id: 'hedge_funds', label: 'Hedge funds', icon: '📊', bucket: 'TAXABLE', section: 'Investments', ret: 0.06 },
  { id: 'commodities', label: 'Gold / commodities', icon: '🥇', bucket: 'TAXABLE', section: 'Investments', ret: 0.082 },
  { id: 'options', label: 'Options', icon: '⚖️', bucket: 'TAXABLE', section: 'Investments', ret: 0.05 },
  { id: 'annuities', label: 'Annuities', icon: '📃', bucket: 'TAXABLE', section: 'Investments', ret: 0.045 },
  { id: 'college_529', label: '529 / College', icon: '🎓', bucket: 'TAXABLE', section: 'Investments', ret: 0.07 },
  { id: 'other_asset', label: 'Other', icon: '📦', bucket: 'TAXABLE', section: 'Investments', ret: 0.05 },
  // Retirement
  { id: '401k', label: '401(k)', icon: '🏛️', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.079 },
  { id: 'trad_ira', label: 'Traditional IRA', icon: '🏛️', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.079 },
  { id: 'roth_ira', label: 'Roth IRA', icon: '🌱', bucket: 'ROTH', section: 'Retirement', ret: 0.079 },
  { id: 'hsa', label: 'HSA', icon: '🩺', bucket: 'PRE_TAX', section: 'Retirement', ret: 0.079 },
  // Property
  { id: 'home', label: 'Home', icon: '🏠', bucket: 'PROPERTY', section: 'Property', ret: 0.045 },
  { id: 'vehicle', label: 'Vehicle', icon: '🚗', bucket: 'PROPERTY', section: 'Property', ret: -0.05 },
];
export const ASSET_SECTIONS = ['Cash', 'Investments', 'Retirement', 'Property'] as const;
// B47 finding 14 (founder, 2026-08-01): in BY-TYPE groupings, cash-bucket accounts (checking,
// savings, money market, CDs…) roll up under the accountant's honest term — never "Savings"
// covering a sweep account that actually holds CDs + money market + cash.
export const CASH_GROUP_LABEL = 'Cash and cash equivalents';
/* ─ MK-NW-F-006 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isCashKind
 *
 * Answers ..... Does this account type sit under the Cash heading on screen?
 *
 * Formula .....
 *     asset kind(kind).bucket = 'CASH'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-006
 * Changed ..... 2026-08-01 (00a40f9)
 */
export const isCashKind = (kind?: string) => assetKind(kind)?.bucket === 'CASH';
/* ─ MK-NW-F-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * assetKind
 *
 * Answers ..... What do we know about this kind of account?
 *
 * Formula .....
 *     id = id); }
 *
 * Called by ... MK-NW-F-006 isCashKind · MK-NW-F-034 benchmarkReturn
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-002 alternativesSummary
 *               MK-NW-F-036 benchmarkInfo · MK-NW-F-034 benchmarkReturn
 *               MK-NW-F-037 blendedReturn · MK-NW-F-052 buildItemizedAccounts
 *               MK-XS-F-031 buildSnapshot · MK-CF-O-017 futurePaycheck
 *               MK-NW-F-006 isCashKind · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-NW-O-005 theAlternativesOutlook
 *               MK-NW-F-003 valueFreshness · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-007
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function assetKind(id?: string) { return ASSET_KINDS.find((k) => k.id === id); }

// ── Derivation layer for the two-axis model (Term #1) ─────────────────────────
// Legacy `kind` → asset class. Wrappers (401k/IRA/Roth/HSA/529/brokerage) hold investments; with no
// per-holding detail we DEFAULT them to equities — the explicit `asset_class` (set by import/editor,
// or per-position later) overrides this best guess.
// Only ASSET-CLASS-SPECIFIC kinds map to a class. WRAPPER kinds (401k, IRAs, HSA, brokerage, 529) are
// deliberately absent — a wrapper holds stocks/bonds/cash, so without explicit holdings we must NOT
// pretend it's stocks (Term #1, #10). assetClassOf() falls those through to 'mixed' / positions.
const KIND_TO_CLASS: Record<string, AssetClass> = {
  // FOUNDER RULE 2026-08-04: cash = cash ONLY. Money-market funds pay dividends → Stocks/ETFs;
  // CDs pay interest → Bonds & CDs (any maturity) — else change/return math silently loses their income.
  checking: 'cash', savings: 'cash', hysa: 'cash', cash_mgmt: 'cash', money_market: 'stocks_etf', cd: 'bonds',
  foreign_currency: 'cash',   // Q08 (founder, 2026-08-26): cash held in that currency
  stocks_etf: 'stocks_etf',
  fixed_income: 'bonds',
  private_equity: 'alternatives', hedge_funds: 'alternatives', commodities: 'alternatives',
  crypto: 'alternatives', annuities: 'alternatives', other_asset: 'alternatives', options: 'alternatives',
  home: 'real_estate', real_estate: 'real_estate', vehicle: 'personal_property',
};

// FOUNDER RULE 2026-08-04 (supersedes the money-market=cash rule and the 12-month CD split):
// CASH means cash only — a sweep/settlement balance. Instruments that pay dividends or interest
// live in the MEASURED buckets, or the change/return math silently loses their income:
// money-market funds → Stocks / Funds (funds paying dividends) · CDs / T-bills → Bonds & CDs.
// B7 (founder brief 2026-08-20): the words, the ticker lists and the ordering live in the ONE
// function now — this is the same name-first question, asked of account labels.
/* ─ MK-NW-F-008 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * incomeBearingClassOf
 *
 * Answers ..... FOUNDER RULE 2026-08-04 (supersedes the money-market=cash rule and the 12-month CD split): CASH means cash only — a sweep/settlement balance.
 *
 * Formula .....
 *     name evidence(label)
 *
 * Called by ... MK-NW-F-120 classEvidenceOf · MK-NW-F-123 holdingNameEvidence
 *
 * Reaches ..... 191 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               … and 173 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-008
 * Changed ..... 2026-08-20 (026b132)
 */
export function incomeBearingClassOf(label?: string): AssetClass | null {
  return nameEvidence(label);
}

/** FOUNDER RULE 2026-08-04 (supersedes build-34 #8's 12-month split): ANY maturity-dated instrument
 *  is a BOND — it pays interest, so it must sit in the measured bucket regardless of how soon it
 *  matures. Stored once as explicit `asset_class`; no maturity → cash (a plain balance). */
/* ─ MK-NW-F-009 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * maturityClass
 *
 * Answers ..... FOUNDER RULE 2026-08-04 (supersedes build-34 #8's 12-month split): ANY maturity-dated instrument is a BOND — it pays interest, so it must sit in the measured bucket regardless of how soon it matures.
 *
 * Formula .....
 *     'bonds'   if maturity date and string(maturity date).trim()
 *     'cash'   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-009
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function maturityClass(maturityDate?: string | null): 'cash' | 'bonds' {
  return maturityDate && String(maturityDate).trim() ? 'bonds' : 'cash';
}

/** The person picked how this account is taxed — what kind of account does that make it, and which tax bucket?
 *  Every choice names its kind, because the kind is the word the account is shown by and what later
 *  rules read: 401(k), Traditional IRA, Roth IRA, HSA, or a brokerage when nothing is chosen. A Roth
 *  401(k) is a 401(k) by its kind and Roth by its tax, the way a linked one is stored — it used to
 *  have no choice of its own and was named a Roth IRA (outside review, 2026-10-05). What an account
 *  HOLDS is a separate answer (MK-NW-F-011 assetClassOf). */
export type AddWrapper = 'taxable' | '401k' | 'trad_ira' | 'roth' | 'roth_401k' | 'hsa';
/* ─ MK-NW-F-010 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * wrapperAccount
 *
 * Answers ..... The person picked how this account is taxed — what does that make it?
 *
 * Formula .....
 *     401k → kind '401k', bucket PRE_TAX
 *     trad_ira → 'trad_ira', PRE_TAX
 *     roth → 'roth_ira', ROTH
 *     roth_401k → '401k', ROTH
 *     hsa → 'hsa', PRE_TAX
 *     anything else → 'brokerage', TAXABLE
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-010
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function wrapperAccount(w?: AddWrapper | null): { kind: string; tax_bucket: TaxBucket } {
  switch (w) {
    case '401k':     return { kind: '401k',     tax_bucket: 'PRE_TAX' };
    case 'trad_ira': return { kind: 'trad_ira', tax_bucket: 'PRE_TAX' };
    case 'roth':     return { kind: 'roth_ira', tax_bucket: 'ROTH' };
    case 'roth_401k': return { kind: '401k',    tax_bucket: 'ROTH' };   // a 401(k) by its kind, Roth by its tax — as a linked one is stored
    case 'hsa':      return { kind: 'hsa',      tax_bucket: 'PRE_TAX' };
    default:         return { kind: 'brokerage', tax_bucket: 'TAXABLE' };   // taxable / unspecified
  }
}

/** What an account's own facts say its class is, before its kind is read: a maturity date first, then
 *  its name — never a property's name. ONE order, read by MK-NW-F-011 assetClassOf and MK-NW-F-053
 *  correctClassOf, which used to read the name first and re-filed 'Ally Money Market CD' maturing
 *  2027-06-30 to Stocks / Funds (outside review OpenAI final, 2026-10-09, DEC-2484i, DEC-3035o). */
/* ─ MK-NW-F-120 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * classEvidenceOf
 *
 * Answers ..... What an account's own facts say its class is, before its kind is read: a maturity date first, then its name — never a property's name.
 *
 * Formula .....
 *     'bonds'   when maturity date and string(maturity date).trim()
 *     is property = tax bucket = 'PROPERTY' (or kind = 'home' (or kind = 'real_estate' (or kind = 'vehicle' when missing or zero) when missing or zero) when missing or zero)
 *     the answer:
 *     nothing   if is property
 *     income bearing class of(label)   otherwise
 *
 * Called by ... MK-NW-F-011 assetClassOf · MK-NW-F-053 correctClassOf
 *
 * Reaches ..... 189 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               … and 171 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-120
 * Changed ..... not in git yet (—)
 */
export function classEvidenceOf(a: AssetAccount): AssetClass | null {
  if (a.maturity_date && String(a.maturity_date).trim()) return 'bonds';   // founder rule 2026-08-04: ANY maturity date is a bond
  // A PROPERTY'S NAME IS A PLACE, NOT EVIDENCE (outside review, 2026-10-07): 'Silver Lake house' read as
  // an alternative and 'Bond Street flat' as a bond, so a home left Real estate. A home, real estate, a
  // vehicle or anything in the property bucket skips the name.
  const isProperty = a.tax_bucket === 'PROPERTY' || a.kind === 'home' || a.kind === 'real_estate' || a.kind === 'vehicle';
  return isProperty ? null : incomeBearingClassOf(a.label);
}

/** What an account is: cash, bonds and CDs, stocks and funds, an alternative, real estate, personal property, or not yet known.
 *  The first that applies. (1) The class the person stated. (2) A maturity date makes it a bond or
 *  CD, whatever its name says — the owner's rule of 2026-08-04, which the name used to outrank
 *  (outside review, 2026-10-05). (3) What its name is evidence for. (4) Its kind. (5) Stocks / Funds
 *  if it lists holdings. (6) Cash if it is a cash account. (7) Property: real estate when its kind is
 *  a home or real estate, when its use is recorded, or when no kind is recorded at all; any other
 *  kind of property is personal property — a ring is not a house. (8) Otherwise not yet known. */
/* ─ MK-NW-F-011 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * assetClassOf
 *
 * Answers ..... What an account is: cash, bonds and CDs, stocks and funds, an alternative, real estate, personal property, or not yet known.
 *
 * Formula .....
 *     asset class   when asset class
 *     evidence = class evidence of(a)
 *     evidence   when evidence
 *     by kind = KIND_TO_CLASS[kind]   if kind
 *     undefined   otherwise
 *     by kind   when by kind
 *     'stocks_etf'   when count of positions and positions
 *     'cash'   when tax bucket = 'CASH'
 *     'real_estate'   if kind is missing (or re use when missing or zero)
 *     'personal_property'   otherwise   when tax bucket = 'PROPERTY'
 *     the answer = 'mixed'
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts · MK-NW-F-001 isAlternative
 *               MK-NW-F-005 accountAllowsTicker · MK-NW-F-007 assetKind
 *               MK-NW-F-009 maturityClass · MK-NW-F-013 realEstateUseOf
 *               MK-NW-F-014 isRealAsset · MK-NW-F-016 cashTotal
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-029 assetAllocation
 *               MK-NW-F-030 earmarkDefault · MK-NW-F-055 isBond
 *               MK-NW-F-063 interestIncomeAnnual · MK-NW-F-106 mortgagesByProperty
 *               MK-NW-F-117 propertyUseMap · MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 134 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               … and 116 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-011
 * Changed ..... 2026-08-04 (abb4c23)
 */
export function assetClassOf(a: AssetAccount): AssetClass {
  if (a.asset_class) return a.asset_class;
  const evidence = classEvidenceOf(a);
  if (evidence) return evidence;                       // founder rule 2026-08-04: cash = cash only
  const byKind = a.kind ? KIND_TO_CLASS[a.kind] : undefined;
  if (byKind) return byKind;
  if (a.positions && a.positions.length) return 'stocks_etf';   // imported ticker holdings ⇒ market securities
  if (a.tax_bucket === 'CASH') return 'cash';
  if (a.tax_bucket === 'PROPERTY') return !a.kind || a.re_use ? 'real_estate' : 'personal_property';
  // A wrapper whose contents we don't know (401k/IRA/brokerage, no positions, no explicit class):
  // don't pretend it's stocks — mark it unspecified so the allocation is honest (#10, user can classify).
  return 'mixed';
}

/** How an account's money is taxed: as it is earned, when it comes out, or not at all.
 *  The treatment stated on the account first. Then a 529 is tax-free — what it earns comes out
 *  untaxed when used for education (IRS Publication 970), and it was read as taxable (outside review,
 *  2026-10-05). Then pre-tax is taxed when it comes out, Roth is tax-free, anything else is taxable.
 *  An HSA stays with pre-tax: it goes in untaxed like a 401(k); how it comes out depends on what it is
 *  used for, which MK-NW-F-108 taxWordsOf says in words. */
/* ─ MK-NW-F-012 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxTreatmentOf
 *
 * Answers ..... How an account's money is taxed: as it is earned, when it comes out, or not at all.
 *
 * Formula .....
 *     tax treatment   when tax treatment
 *     'tax_free'   when kind = 'college_529'
 *     'tax_deferred'   when tax bucket = 'PRE_TAX'
 *     'tax_free'   when tax bucket = 'ROTH'
 *     'taxable'
 *
 * Called by ... MK-NW-F-025 accountDisplayName · MK-NW-F-108 taxWordsOf
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames
 *               MK-XS-F-002 dataGaps · MK-XS-F-102 ingestSync
 *               MK-XS-F-119 namesFor · MK-NW-F-108 taxWordsOf
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-012
 * Changed ..... 2026-06-22 (ec4bf1f)
 */
export function taxTreatmentOf(a: AssetAccount): TaxTreatment {
  if (a.tax_treatment) return a.tax_treatment;
  if (a.kind === 'college_529') return 'tax_free';
  if (a.tax_bucket === 'PRE_TAX') return 'tax_deferred';
  if (a.tax_bucket === 'ROTH') return 'tax_free';
  return 'taxable';
}

/** How an account is taxed, in the words a person reads on the account's page.
 *  A 529 and an HSA say what makes them tax-free — education, medical costs — because that is the
 *  whole point of each and "tax-free (Roth)" or "taxed when it comes out" would be wrong for them
 *  (outside review, 2026-10-05; IRS Publications 970 and 969). Every other account reads by its
 *  treatment (MK-NW-F-012 taxTreatmentOf). */
/* ─ MK-NW-F-108 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxWordsOf
 *
 * Answers ..... How an account is taxed, in the words a person reads on the account's page.
 *
 * Formula .....
 *     'tax − free for education'   when kind = 'college_529'
 *     'pre − tax — tax − free for medical costs'   when kind = 'hsa'
 *     t = tax treatment of(a)
 *     the answer:
 *     'pre − tax — taxed when it comes out'   if t = 'tax_deferred'
 *     'tax − free (roth)'   if tax bucket = 'ROTH'
 *     'tax − free'   otherwise   if t = 'tax_free'
 *     'taxable'   otherwise   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-108
 * Changed ..... not in git yet (—)
 */
export function taxWordsOf(a: AssetAccount): string {
  // WHAT THE ACCOUNT IS DECIDES ITS WORDS FIRST (outside review, 2026-10-07): a 529 stated tax-free read
  // 'tax-free (Roth)', and an HSA stated tax-deferred read 'taxed when it comes out' — both false.
  if (a.kind === 'college_529') return 'tax-free for education';
  if (a.kind === 'hsa') return 'pre-tax — tax-free for medical costs';
  const t = taxTreatmentOf(a);
  // '(Roth)' only for an account in the Roth bucket; any other tax-free account is simply tax-free
  return t === 'tax_deferred' ? 'pre-tax — taxed when it comes out' : t === 'tax_free' ? (a.tax_bucket === 'ROTH' ? 'tax-free (Roth)' : 'tax-free') : 'taxable';
}

/** Real-estate use (primary/rental/secondary/land); only meaningful when assetClassOf === 'real_estate'.
 *  Defaults to 'primary' (the conservative nest-egg exclusion); explicit `re_use` overrides. */
/* ─ MK-NW-F-013 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * realEstateUseOf
 *
 * Answers ..... Real-estate use (primary/rental/secondary/land); only meaningful when assetClassOf === 'real_estate'.
 *
 * Formula .....
 *     nothing   when asset class of(a) ! = 'real_estate'
 *     'land'   when re use = 'land'
 *     re use (or 'primary' when missing)   when !accounts and !array.is array(rentals)
 *     use = property use map(accounts ?? [a], rentals).get(string(asset id))
 *     the answer:
 *     'primary'   if use = 'home'
 *     'rental'   if use = 'rental'
 *     'secondary'   otherwise   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-013
 * Changed ..... 2026-06-22 (ec4bf1f)
 */
export function realEstateUseOf(a: AssetAccount, accounts?: AssetAccount[], rentals?: RentEntry[] | null): RealEstateUse | null {
  // ONLY A PROPERTY HAS A USE: a car asked this question used to be told "primary" (outside review,
  // 2026-10-07). With nothing stated, the household decides, by the owner's rule of 2026-10-04
  // (DEC-1926) as built in MK-NW-F-107 propertyUses: the property marked as the home lived in is the
  // home; with none marked, the one entered first is, and every other property is a second home. Two
  // properties with no use stated used to BOTH be the home. Asked about one account alone, with no
  // household handed in, the old reading stands: it is the home.
  if (assetClassOf(a) !== 'real_estate') return null;
  if (a.re_use === 'land') return 'land';
  // THE ONE READING (outside review, 2026-10-07): this, MK-NW-F-110 primaryHomeIdOf and MK-NW-F-107
  // propertyUses each read a property's use their own way, and disagreed. All three now read
  // propertyUseMap. Handed the rent entries from the Income screen, a property is a rental only when an
  // entry names it (DEC-1926); a rented-out house marked as the home is a rental.
  // Handed the rent entries but no household, the property is read as a household of one by the same
  // map: a stored 'rental' no entry names is a second home, as propertyUseMap says for the same input
  // (outside review OpenAI final, 2026-10-09, DEC-3035p). Not handed the entries, the stored word stands.
  if (!accounts && !Array.isArray(rentals)) return a.re_use ?? 'primary';
  const use = propertyUseMap(accounts ?? [a], rentals).get(String(a.asset_id));
  return use === 'home' ? 'primary' : use === 'rental' ? 'rental' : 'secondary';
}

/** One rent entry from the Income screen: what it brings in, what it costs, and the property it names. */
export type RentEntry = { income?: any; expenses?: any; property_id?: any };
// DEC-3768c (2026-10-10): a rent figure with words in it is not read — it counts as not entered, never as
// the digits inside it ("about 2k" was $2 and made the property a rental). One strict reader, rentFigure.
/** A rent figure as a number: the figure typed, or 0 when none or when it is not a plain number. */
/* ─ MK-NW-F-114 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * rentAmount
 *
 * Answers ..... DEC-3768c (2026-10-10): a rent figure with words in it is not read — it counts as not entered, never as the digits inside it ("about 2k" was $2 and made the property a rental).
 *
 * Formula .....
 *     rent figure(v) (or 0 when missing)
 *
 * Called by ... MK-NW-F-115 liveRent
 *
 * Reaches ..... 27 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-079 EF
 *               MK-NW-F-037 blendedReturn · MK-NW-F-035 blendedVolatility
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-PL-F-077 clamp · MK-CF-O-017 futurePaycheck
 *               MK-NW-F-115 liveRent · MK-PL-F-026 planDoor
 *               MK-NW-F-110 primaryHomeIdOf · MK-NW-F-117 propertyUseMap
 *               MK-NW-F-107 propertyUses · MK-NW-F-013 realEstateUseOf
 *               MK-NW-F-116 rentedIdsOf · MK-NW-F-033 retirementEarmarkedValue
 *               MK-PL-F-049 retirementSpendMonthly · MK-PL-F-008 rmdSchedule
 *               … and 9 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-114
 * Changed ..... not in git yet (—)
 */
const rentAmount = (v: any) => rentFigure(v) ?? 0;
/** The rent entries that carry a figure: rent coming in or costs going out above zero. */
/* ─ MK-NW-F-115 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * liveRent
 *
 * Answers ..... The rent entries that carry a figure: rent coming in or costs going out above zero.
 *
 * Formula .....
 *     rentals (or none when missing) where rent amount(income) > 0 (or rent amount(expenses) > 0 when missing or zero)
 *
 * Called by ... MK-NW-F-116 rentedIdsOf · MK-NW-F-117 propertyUseMap
 *
 * Reaches ..... 26 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-079 EF
 *               MK-NW-F-037 blendedReturn · MK-NW-F-035 blendedVolatility
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-PL-F-077 clamp · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-026 planDoor · MK-NW-F-110 primaryHomeIdOf
 *               MK-NW-F-117 propertyUseMap · MK-NW-F-107 propertyUses
 *               MK-NW-F-013 realEstateUseOf · MK-NW-F-116 rentedIdsOf
 *               MK-NW-F-033 retirementEarmarkedValue · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               … and 8 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-115
 * Changed ..... not in git yet (—)
 */
const liveRent = (rentals: RentEntry[] | null | undefined) => (rentals ?? []).filter((r) => rentAmount(r?.income) > 0 || rentAmount(r?.expenses) > 0);
/** Which properties the rent entries name, by their identifiers. */
/* ─ MK-NW-F-116 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * rentedIdsOf
 *
 * Answers ..... Which properties the rent entries name, by their identifiers.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-117 propertyUseMap
 *
 * Reaches ..... 25 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-079 EF
 *               MK-NW-F-037 blendedReturn · MK-NW-F-035 blendedVolatility
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-PL-F-077 clamp · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-026 planDoor · MK-NW-F-110 primaryHomeIdOf
 *               MK-NW-F-117 propertyUseMap · MK-NW-F-107 propertyUses
 *               MK-NW-F-013 realEstateUseOf · MK-NW-F-033 retirementEarmarkedValue
 *               MK-PL-F-049 retirementSpendMonthly · MK-PL-F-008 rmdSchedule
 *               MK-PL-F-068 selectWillItLast · MK-XS-F-032 snapshotFromOnboarding
 *               … and 7 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-116
 * Changed ..... not in git yet (—)
 */
const rentedIdsOf = (rentals: RentEntry[] | null | undefined) =>
  new Set(liveRent(rentals).filter((r) => r?.property_id != null && r.property_id !== '').map((r) => String(r.property_id)));

/** What each property is for — the home lived in, a rental, or a second home — by his rule DEC-1926: a rental only when a rent entry on the Income screen names it; the one marked as the home is the home; with none marked and no use stated on any, the one entered first; every other property is a second home. With no rent entries handed in at all, a property stored as a rental is read as one. */
/* ─ MK-NW-F-117 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * propertyUseMap
 *
 * Answers ..... What each property is for — the home lived in, a rental, or a second home — by his rule DEC-1926: a rental only when a rent entry on the Income screen names it; the one marked as the home is the home; with none marked and no use stated on any, the one entered first; every other property is a second home.
 *
 * Formula .....
 *     told = array.is array(rentals)
 *     properties = accounts (or none when missing) where asset class of(each) = 'real_estate'
 *     named = rented ids of(rentals)
 *     out = new map<string, 'home' | 'rental' | 'second'>()
 *     rest = properties where !out.has(string(asset id))
 *     marked = rest.find((a) => re use = 'primary')
 *     candidates = rest where re use ! = 'rental'
 *     other use stated = rest.some((a) => re use ≠ nothing and re use ! = 'rental')
 *     home = marked (or undefined   if other use stated
 *     candidates[candidates.length − 1]   otherwise when missing)
 *     others = rest where each ! = home
 *     unnamed rent = live rent(rentals).some((r) => property id = nothing or property id = '')
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-013 realEstateUseOf · MK-NW-F-107 propertyUses
 *               MK-NW-F-110 primaryHomeIdOf · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 24 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-079 EF
 *               MK-NW-F-037 blendedReturn · MK-NW-F-035 blendedVolatility
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-PL-F-077 clamp · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-026 planDoor · MK-NW-F-110 primaryHomeIdOf
 *               MK-NW-F-107 propertyUses · MK-NW-F-013 realEstateUseOf
 *               MK-NW-F-033 retirementEarmarkedValue · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               … and 6 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-117
 * Changed ..... not in git yet (—)
 */
export function propertyUseMap(accounts: AssetAccount[], rentals?: RentEntry[] | null): Map<string, 'home' | 'rental' | 'second'> {
  const told = Array.isArray(rentals);                       // handed the Income screen's rent entries, even an empty list
  const properties = (accounts ?? []).filter((a) => assetClassOf(a) === 'real_estate');
  const named = rentedIdsOf(rentals);
  const out = new Map<string, 'home' | 'rental' | 'second'>();
  // a property is a rental when a rent entry names it; told the entries, a stored 'rental' with no
  // entry is a second home (DEC-1926: "unless rental income is added on the income screen, assume
  // property is second or vacation home"); not told, the stored word stands
  for (const a of properties) if (named.has(String(a.asset_id)) || (!told && a.re_use === 'rental')) out.set(String(a.asset_id), 'rental');
  const rest = properties.filter((a) => !out.has(String(a.asset_id)));
  const marked = rest.find((a) => a.re_use === 'primary');
  // THE ENTERED-FIRST FALLBACK, when nothing is marked home (OpenAI review, 2026-10-09). A property stored
  // as 'rental' is never made the home by it — a renter who owns only a rental house with no rent entered
  // owns a second home (DEC-1926) — but its old word does not stop the fallback choosing among the others:
  // beside it, a house with nothing stated and its mortgage is the home, or that mortgage would be counted
  // in Debts AND in the Rent / Mortgage budget line. Any other stated use (second home, land) stops it.
  const candidates = rest.filter((a) => a.re_use !== 'rental');
  const otherUseStated = rest.some((a) => a.re_use != null && a.re_use !== 'rental');
  // addAsset puts the newest first, so the property entered first is the last one in the list
  const home = marked ?? (otherUseStated ? undefined : candidates[candidates.length - 1]);
  if (home) out.set(String(home.asset_id), 'home');
  const others = rest.filter((a) => a !== home);
  const unnamedRent = liveRent(rentals).some((r) => r?.property_id == null || r.property_id === '');
  for (const a of others) out.set(String(a.asset_id), unnamedRent && others.length === 1 ? 'rental' : 'second');
  return out;
}

/** Which property is the home lived in: the one marked so; with none marked and no use stated on any, the one entered first; otherwise none. */
/* ─ MK-NW-F-110 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * primaryHomeIdOf
 *
 * Answers ..... Which property is the home lived in: the one marked so; with none marked and no use stated on any, the one entered first; otherwise none.
 *
 * Formula .....
 *     nothing
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-033 retirementEarmarkedValue · MK-NW-F-035 blendedVolatility
 *               MK-NW-F-037 blendedReturn · MK-PL-F-001 taxBucketSplit
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-037 blendedReturn
 *               MK-NW-F-035 blendedVolatility · MK-CF-F-107 buildPaycheckYear
 *               MK-XS-F-031 buildSnapshot · MK-PL-F-077 clamp
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-026 planDoor
 *               MK-NW-F-033 retirementEarmarkedValue · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               MK-NW-O-005 theAlternativesOutlook · MK-NW-F-003 valueFreshness
 *               MK-PL-F-065 volOf · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-110
 * Changed ..... not in git yet (—)
 */
export function primaryHomeIdOf(accounts: AssetAccount[], rentals?: RentEntry[] | null): string | null {
  // the one reading (propertyUseMap, his rule DEC-1926). NO HOME IS null, not 'not given'
  // (outside review, 2026-10-07): with one property stated a second home and another with no use, there
  // is no home — and earmarkDefault, told nothing, read the unstated one as the home and set it at 0%.
  for (const [id, use] of propertyUseMap(accounts, rentals)) if (use === 'home') return id;
  return null;
}

/** True when the asset is a real/physical asset (real estate or personal property) — excluded from
 *  investable assets and the nest egg (Term #4/#7). */

/** Whether an account is a physical asset, meaning real estate or personal property. */
/* ─ MK-NW-F-014 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isRealAsset
 *
 * Answers ..... Whether an account is a physical asset, meaning real estate or personal property.
 *
 * Formula .....
 *     c = asset class of(a)
 *     the answer = c = 'real_estate' (or c = 'personal_property' when missing or zero)
 *
 * Called by ... MK-NW-F-022 investableAssets · MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-022 investableAssets
 *               MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-014
 * Changed ..... 2026-06-22 (535cc66)
 */
export function isRealAsset(a: AssetAccount): boolean {
  const c = assetClassOf(a);
  return c === 'real_estate' || c === 'personal_property';
}

// ── Canonical asset totals (Term #2/#3/#4) ────────────────────────────────────
// THE single source for each total — screens read these, never re-sum inline. All derive from
// assetClassOf, so they stay consistent across every surface (Net Worth, Home, Insights, donut).

/** Adds up the balances of the accounts that pass a given test. */
/* ─ MK-NW-F-066 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sumWhere
 *
 * Answers ..... Adds up the balances of the accounts that pass a given test.
 *
 * Formula .....
 *     hits = accounts (or none when missing) where pred
 *     missing = hits where balance = nothing (or !number.is finite(balance as number) when missing or zero)
 *     total = Σ over hits where !missing.includes(each) of (balance as number)
 *     the answer:
 *     total = total
 *     missing count = count of missing
 *
 * Called by ... MK-NW-F-022 investableAssets
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-022 investableAssets
 *               MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-066
 * Changed ..... not in git yet (—)
 */
export function sumWhere(accounts: AssetAccount[], pred: (a: AssetAccount) => boolean): { total: number; missingCount: number } {
  // A BALANCE THAT IS NOT THERE IS NOT $0 (outside review batch 06, 2026-10-07): a linked account that
  // failed to sync was added as 0 and the total looked complete. Only the balances that exist are added,
  // and how many were missing is said beside it — the screen's amber box names them. Negative balances
  // (an overdraft) are real and count. Nothing passing the test is a true 0, not flagged.
  const hits = (accounts ?? []).filter(pred);
  const missing = hits.filter((a) => a.balance == null || !Number.isFinite(a.balance as number));
  const total = hits.filter((a) => !missing.includes(a)).reduce((t, a) => t + (a.balance as number), 0);
  return { total, missingCount: missing.length };
}

/** Everything owned, added up: the balance of every account. */
/* ─ MK-NW-F-015 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * totalAssets
 *
 * Answers ..... Everything owned, added up: the balance of every account.
 *
 * Formula .....
 *     Σ over accounts (or none when missing) of (balance (or 0 when missing or zero))
 *
 * Called by ... MK-NW-F-022 investableAssets
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-022 investableAssets
 *               MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-015
 * Changed ..... 2026-08-10 (e37d50e)
 */
export function totalAssets(accounts: AssetAccount[]): number {
  return ((accounts ?? []).reduce((t, a) => t + (a.balance || 0), 0));
}
/** Cash & cash equivalents (Term #3) — THE cash number, and the same one the Net Worth CASH group
 *  shows. L-7 fix 2026-08-10: this used to count whole cash accounts only, so a connected brokerage's
 *  sweep balance was cash in the donut and the CASH group but NOT in the emergency emergency fund — the same
 *  screen printed "CASH $8,838" above "$8,000 cash ÷ …". Both now read the class breakdown. */

/** All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.
 *  An investment account's cash is the cash part of its split (MK-NW-F-027 accountClassBreakdown) —
 *  a linked account's, and since 2026-10-05 the cash a hand-built account records for itself, which
 *  was counted nowhere (outside review). Any other account counts whole when its class is cash. */
/* ─ MK-NW-F-016 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * cashTotal
 *
 * Answers ..... All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.
 *
 * Formula .....
 *     b = account class breakdown(a)
 *     the answer = t + (b ? cash : asset class of(a) = 'cash' ? (balance or 0) : 0)
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-O-004 theEmergencyFund · MK-NW-O-003 theNetWorth
 *
 * Serves ...... MK-NW-M-014
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-016
 * Changed ..... 2026-08-10 (e37d50e)
 */
export function cashTotal(accounts: AssetAccount[]): number {
  return ((accounts ?? []).reduce((t, a) => {
    const b = accountClassBreakdown(a);
    return t + (b ? b.cash : assetClassOf(a) === 'cash' ? (a.balance || 0) : 0);
  }, 0));
}

/** Everything classed as Stocks / Funds, wherever it sits — an account that holds several classes gives only its Stocks / Funds part (MK-NW-F-029 assetAllocation). */
/* ─ MK-NW-F-017 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * equitiesTotal
 *
 * Answers ..... Everything classed as Stocks / Funds, wherever it sits — an account that holds several classes gives only its Stocks / Funds part (MK-NW-F-029 assetAllocation).
 *
 * Formula .....
 *     asset allocation(accounts).stocks etf
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-017
 * Changed ..... 2026-06-22 (535cc66)
 */
export function equitiesTotal(accounts: AssetAccount[]): number {
  return assetAllocation(accounts).stocks_etf;
}

/** Everything classed as Bonds & CDs, wherever it sits — an account that holds several classes gives only its Bonds & CDs part (MK-NW-F-029 assetAllocation). */
/* ─ MK-NW-F-018 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * fixedIncomeTotal
 *
 * Answers ..... Everything classed as Bonds & CDs, wherever it sits — an account that holds several classes gives only its Bonds & CDs part (MK-NW-F-029 assetAllocation).
 *
 * Formula .....
 *     asset allocation(accounts).bonds
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-018
 * Changed ..... 2026-06-22 (535cc66)
 */
export function fixedIncomeTotal(accounts: AssetAccount[]): number {
  return assetAllocation(accounts).bonds;
}

/** Everything classed as Alternatives, wherever it sits — an account that holds several classes gives only its Alternatives part (MK-NW-F-029 assetAllocation). */
/* ─ MK-NW-F-019 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * alternativesTotal
 *
 * Answers ..... Everything classed as Alternatives, wherever it sits — an account that holds several classes gives only its Alternatives part (MK-NW-F-029 assetAllocation).
 *
 * Formula .....
 *     asset allocation(accounts).alternatives
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-019
 * Changed ..... 2026-06-22 (aa23839)
 */
export function alternativesTotal(accounts: AssetAccount[]): number {
  return assetAllocation(accounts).alternatives;
}

/** Everything classed as Real estate, wherever it sits — an account that holds several classes gives only its Real estate part (MK-NW-F-029 assetAllocation). */
/* ─ MK-NW-F-020 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * realEstateTotal
 *
 * Answers ..... Everything classed as Real estate, wherever it sits — an account that holds several classes gives only its Real estate part (MK-NW-F-029 assetAllocation).
 *
 * Formula .....
 *     asset allocation(accounts).real estate
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-020
 * Changed ..... 2026-06-22 (aa23839)
 */
export function realEstateTotal(accounts: AssetAccount[]): number {
  return assetAllocation(accounts).real_estate;
}
/** The total value of everything invested: stocks and funds, bonds and CDs, alternatives and what is not yet classed, in whatever kind of account they sit, with cash and property left out.
 *  THE INVESTMENTS LINE ON NET WORTH, and the one function for it (owner, DEC-0343). Read from the
 *  class split (MK-NW-F-029 assetAllocation), so cash sitting uninvested inside an account is on the
 *  Cash line and not here, and a CD inside a cash account is here and not on the Cash line. It used
 *  to count each investment account whole, so that cash was in both lines (outside review,
 *  2026-10-05). Always: cash + investments = cash and investments together (MK-NW-F-022). */
/* ─ MK-NW-F-021 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * investmentsTotal
 *
 * Answers ..... The total value of everything invested: stocks and funds, bonds and CDs, alternatives and what is not yet classed, in whatever kind of account they sit, with cash and property left out.
 *
 * Formula .....
 *     by = asset allocation(accounts)
 *     the answer = by.stocks etf + by.bonds + by.alternatives + by.mixed
 *
 * Called by ... MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-021
 * Changed ..... 2026-08-11 (4975971)
 */
export function investmentsTotal(accounts: AssetAccount[]): number {
  const by = assetAllocation(accounts);
  return by.stocks_etf + by.bonds + by.alternatives + by.mixed;
}
/** Investable assets (Term #4) = all financial assets (cash + investments + retirement balances),
 *  EXCLUDING real estate + personal property. */

/** Everything owned except real estate and personal property: cash, investments and retirement balances. */
/* ─ MK-NW-F-022 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * investableAssets
 *
 * Answers ..... Everything owned except real estate and personal property: cash, investments and retirement balances.
 *
 * Formula .....
 *     sum where(accounts, (a) => !is real asset(a)).total
 *
 * Called by ... MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-022
 * Changed ..... 2026-08-11 (4975971)
 */
export function investableAssets(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => !isRealAsset(a)).total;
}
/** Asset value grouped by class — for the Net Worth donut (#19). Sums to totalAssets(). */
/** THE wrapper word for a naming rule — the kind of ACCOUNT it is, not what it holds. A kind like
 *  'stocks_etf' or 'crypto' describes the holdings; the account they sit in is a Brokerage, and that
 *  is the word a person recognises on a statement (founder rule 2026-08-11:
 *  "Institution + Brokerage/checking/savings/…" and "Institution + 401k/RothIRA/HSA/…"). */
const KIND_TO_WRAPPER: Record<string, string> = {
  checking: 'Checking', savings: 'Savings', hysa: 'High-yield savings',
  money_market: 'Money market', cd: 'CD', cash_mgmt: 'Cash management', foreign_currency: 'Foreign currency',
  // what a taxable investment account holds wears the account's own word…
  brokerage: 'Brokerage', stocks_etf: 'Brokerage', fixed_income: 'Brokerage',
  commodities: 'Brokerage', options: 'Brokerage', annuities: 'Annuity',
  // …but a kind that names CONTENTS, not an account, claims no wrapper (outside review batch 06,
  // 2026-10-07): a crypto wallet, a private-equity stake, a hedge-fund interest or 'other' is not a
  // brokerage account unless the person said so (see wrapperWord)
  // tax-advantaged wrappers — these ALWAYS show, because the wrapper is the tax treatment
  '401k': '401(k)', trad_ira: 'Traditional IRA', roth_ira: 'Roth IRA', hsa: 'HSA', college_529: '529',
  home: 'Home', vehicle: 'Vehicle',
};

/** The plain word for the kind of account something sits in, such as 401(k) or IRA, or nothing when that kind has no such word. */
/* ─ MK-NW-F-023 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * wrapperWord
 *
 * Answers ..... The plain word for the kind of account something sits in, such as 401(k) or IRA, or nothing when that kind has no such word.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-022 investableAssets · MK-NW-F-025 accountDisplayName
 *
 * Reaches ..... 15 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-F-025 accountDisplayName
 *               MK-NW-F-026 accountDisplayNames · MK-XS-F-002 dataGaps
 *               MK-XS-F-102 ingestSync · MK-NW-F-022 investableAssets
 *               MK-XS-F-119 namesFor · MK-NW-O-003 theNetWorth
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-023
 * Changed ..... 2026-08-11 (4975971)
 */
export const wrapperWord = (kind?: string, a?: { wrapper_confirmed?: boolean }): string =>
  (kind ? KIND_TO_WRAPPER[kind] ?? (a?.wrapper_confirmed && ['other_asset', 'crypto', 'private_equity', 'hedge_funds'].includes(kind) ? 'Brokerage' : '') : '');

/** The last four digits of an account, or null when we genuinely don't have them. Reads the stored
 *  mask ('••4821') or an account number, and only ever returns FOUR DIGITS — E*TRADE relays a
 *  scrambled identifier through SnapTrade whose tail is gibberish, and showing that as "your last
 *  four" would be worse than showing nothing (live-verified 2026-07-19). */
/* ─ MK-NW-F-024 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountLastFour
 *
 * Answers ..... The last four digits of an account, or null when we genuinely don't have them.
 *
 * Formula .....
 *     digits = string(raw ?? '').replace( ÷ \D ÷ g, '')
 *     digits.slice(-4)   when digits.length ≥ 4
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-025 accountDisplayName
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames
 *               MK-XS-F-002 dataGaps · MK-XS-F-102 ingestSync
 *               MK-XS-F-119 namesFor · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-024
 * Changed ..... 2026-08-11 (bfefb86)
 */
export function accountLastFour(a: { mask?: string; account_number?: string }): string | null {
  for (const raw of [a.mask, (a as any).account_number]) {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
  }
  return null;
}

/** The ONE display name for an account row (build-43 finding #1): institution prefixes the label
 *  ONLY when the label doesn't already say it (E*TRADE's own name is "E*Trade Individual Brokerage" —
 *  prefixing the institution again rendered "E-Trade E*Trade Individual…"), and the broker's mask
 *  suffixes when present so two same-named accounts are tellable apart (wireframe: "Brokerage ...4821"). */

/** The one name an account is shown by, built from its institution, the kind of account and its last four digits where they are known. */
/* ─ MK-NW-F-025 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountDisplayName
 *
 * Answers ..... The one name an account is shown by, built from its institution, the kind of account and its last four digits where they are known.
 *
 * Formula .....
 *     inst raw = (institution ?? '').trim()
 *     last4 = account last four(a)
 *     kind word = wrapper word((a as any).kind, a as any)
 *     treatment = tax treatment of(a as asset account)
 *     tax advantaged = treatment ! = 'taxable'
 *     tax word = 'Roth'   if treatment = 'tax_free'
 *     '401(k) ÷ IRA'   otherwise
 *     `${inst raw} ${wrapper} -${last4}`   if last4
 *     `${inst raw} ${wrapper}`   otherwise   when tax advantaged and wrapper
 *     `${inst raw} -${last4}`   when last4
 *     `${inst raw} ${wrapper}`   when wrapper
 *     label = (label ?? '').trim()
 *     pos = ((a as any).positions ?? []) as any[]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-026 accountDisplayNames
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames
 *               MK-XS-F-002 dataGaps · MK-XS-F-102 ingestSync
 *               MK-XS-F-119 namesFor · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-025
 * Changed ..... 2026-08-11 (4975971)
 */
export function accountDisplayName(a: Pick<AssetAccount, 'label' | 'institution' | 'mask'> & { positions?: unknown[]; kind?: string; tax_bucket?: TaxBucket; tax_treatment?: TaxTreatment }): string {
  // FOUNDER RULE 2026-08-11 (refined) — THE account name, on every surface:
  //
  //   TAXABLE accounts      → institution + last four            "Vanguard -5738"
  //                           no digits?  institution + wrapper  "Vanguard Brokerage"
  //   TAX-ADVANTAGED        → institution + wrapper + last four  "Vanguard Roth IRA -5738"
  //                           no digits?  institution + wrapper  "Vanguard Roth IRA"
  //   two identical names   → a trailing · 1 / · 2 (accountDisplayNames)
  //
  // Why the wrapper is compulsory on a tax-advantaged account and optional on a taxable one: the
  // wrapper IS the tax treatment. A Roth IRA and a brokerage at the same firm behave differently for
  // withdrawals, required distributions and the nest egg, so the name has to carry it. On a taxable
  // account the digits alone identify it and the wrapper adds nothing the row needs.
  const instRaw = (a.institution ?? '').trim();
  const last4 = accountLastFour(a);
  const kindWord = wrapperWord((a as any).kind, a as any);
  const treatment = taxTreatmentOf(a as AssetAccount);
  const taxAdvantaged = treatment !== 'taxable';
  // A TAX-ADVANTAGED ACCOUNT MUST SHOW WHAT IT IS (the rule above). The form for adding an account by
  // hand asks "Taxable · 401(k) / IRA · Roth" and records the answer as the tax bucket, on a plain
  // brokerage kind — so a Roth added there read "Vanguard Brokerage", the one word the rule exists to
  // prevent (found 2026-10-05). Where the kind says only "Brokerage", the tax answer is the word.
  // And (outside review, 2026-10-07): a 401(k) in the Roth bucket is a Roth 401(k) — beside a pre-tax
  // 401(k) at one employer both read 'Fidelity 401(k)'; and a tax-advantaged account with NO kind took no
  // word at all, so a Roth read 'Vanguard -1234'. The tax answer supplies the word in both cases.
  const taxWord = treatment === 'tax_free' ? 'Roth' : '401(k) / IRA';
  // (with no kind, only where digits would otherwise stand alone — without digits the person's own
  // label follows the institution and already says what it is: 'Fidelity 401(k)')
  const wrapper = taxAdvantaged && (kindWord === 'Brokerage' || (!kindWord && !!last4)) ? taxWord
    : taxAdvantaged && kindWord === '401(k)' && (a.tax_bucket === 'ROTH' || treatment === 'tax_free') ? 'Roth 401(k)'
    : kindWord;
  if (instRaw) {
    if (taxAdvantaged && wrapper) return last4 ? `${instRaw} ${wrapper} -${last4}` : `${instRaw} ${wrapper}`;
    if (last4) return `${instRaw} -${last4}`;
    if (wrapper) return `${instRaw} ${wrapper}`;
  }

  // NO digits available (a broker that won't share the number, or a hand-entered account): fall back
  // to what we had before — institution + label, never doubled. The founder's rule fixes the verbose
  // broker wording wherever the digits exist; where they don't, dropping the label would leave two
  // accounts at one firm looking identical, which is worse.
  let label = (a.label ?? '').trim();
  // B45 founder finding: an older import kept the generic "Imported holdings" label while newer
  // single-security imports are named by their ticker (so rows read "E*TRADE LCTX" like
  // "E*TRADE VMFXX"). Heal old data at display time: a generic-labeled account holding exactly
  // ONE security wears that security's name. Every screen inherits — this is the one naming helper.
  const pos = ((a as any).positions ?? []) as any[];
  if (/^imported holdings?$/i.test(label) && pos.length === 1 && (pos[0]?.ticker || pos[0]?.label)) {
    label = String(pos[0].ticker || pos[0].label).trim();
  }
  const inst = (a.institution ?? '').trim();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = inst && !norm(label).includes(norm(inst)) ? `${inst} ${label}` : label || inst;
  const mask = (a.mask ?? '').trim();
  return mask && !norm(base).includes(norm(mask)) ? `${base} ${mask}` : base;
}

/** The name each account in a list is shown by, with no two alike.
 *  Each takes its own name (MK-NW-F-025 accountDisplayName). Accounts that end up with the same name
 *  get · 1, · 2 and so on, in the order of their ids read as text — an id is made from the moment the
 *  account was created, so that is the order they were made, on every device. A number already in
 *  use as somebody's name is skipped, so "Savings · 1" is never shown twice (outside review,
 *  2026-10-05). */
/* ─ MK-NW-F-026 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountDisplayNames
 *
 * Answers ..... The name each account in a list is shown by, with no two alike.
 *
 * Formula .....
 *     base = a lookup of for each of accounts: [asset id, account display name(each)]
 *     counts = new map<string, number>()
 *     seen = new map<string, number>()
 *     out = new map<string, string>()
 *     taken = a list with no repeats of [...base.values()] where counts.get(each) = 1
 *     by id = (x: { asset id: unknown }, y: { asset id: unknown }) => (string(asset id) < string(asset id) ? -1 : string(asset id) > string(asset id) ? 1 : 0)
 *     n = base.get(asset id)!
 *     i = (seen.get(n) ?? 0) + 1
 *     the answer = out
 *
 * Called by ... MK-NW-F-025 accountDisplayName · MK-NW-O-008 thePerformance
 *               MK-XS-F-102 ingestSync · MK-XS-F-119 namesFor
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames
 *               MK-XS-F-002 dataGaps · MK-XS-F-102 ingestSync
 *               MK-XS-F-119 namesFor · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-026
 * Changed ..... 2026-07-24 (8f03c59)
 */
export function accountDisplayNames(accounts: (Pick<AssetAccount, 'asset_id' | 'label' | 'institution' | 'mask'> & { positions?: unknown[] })[]): Map<string, string> {
  const base = new Map(accounts.map((a) => [a.asset_id, accountDisplayName(a)]));
  const counts = new Map<string, number>();
  for (const n of base.values()) counts.set(n, (counts.get(n) ?? 0) + 1);
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  // a name only one account has is that account's, and no numbered name may take it
  const taken = new Set([...base.values()].filter((n) => counts.get(n) === 1));
  const byId = (x: { asset_id: unknown }, y: { asset_id: unknown }) => (String(x.asset_id) < String(y.asset_id) ? -1 : String(x.asset_id) > String(y.asset_id) ? 1 : 0);
  for (const a of [...accounts].sort(byId)) {
    const n = base.get(a.asset_id)!;
    if ((counts.get(n) ?? 0) > 1) {
      let i = (seen.get(n) ?? 0) + 1;
      while (taken.has(`${n} · ${i}`)) i += 1;
      seen.set(n, i);
      taken.add(`${n} · ${i}`);
      out.set(a.asset_id, `${n} · ${i}`);
    } else out.set(a.asset_id, n);
  }
  return out;
}

/** What one holding inside an account is, by the one rule the split, the words under it and the account's page all use.
 *  The person's own answer first — it outranks everything. A holding nothing could class is not yet
 *  known, until they say (owner, 2026-09-30). Otherwise its name decides unless the name says cash —
 *  a money-market fund is Stocks / Funds, a CD or a T-bill is Bonds & CDs, whatever tag the broker
 *  sent (owner, DEC-0051, DEC-0092) — and then the class stored when it arrived. */
/* ─ MK-NW-F-109 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * holdingClassOf
 *
 * Answers ..... What one holding inside an account is, by the one rule the split, the words under it and the account's page all use.
 *
 * Formula .....
 *     tag = asset class
 *     by kind = KIND_TO_CLASS[kind]   if kind
 *     undefined   otherwise
 *     stored (or 'mixed' when missing)   when class source = 'user'
 *     'mixed'   when class asked
 *     by name = holding name evidence(p)
 *     by name   when by name and by name ! = 'cash'
 *     the answer:
 *     stored (or 'cash'   if by name = 'cash'
 *     'mixed'   otherwise when missing)
 *
 * Called by ... MK-NW-F-027 accountClassBreakdown · MK-NW-F-028 classPortionLabel
 *               MK-NW-F-067 plural · MK-NW-F-113 altPartsOf
 *
 * Reaches ..... 29 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-079 EF · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-113 altPartsOf
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-019 alternativesTotal
 *               MK-NW-F-029 assetAllocation · MK-NW-F-016 cashTotal
 *               MK-NW-F-028 classPortionLabel · MK-XS-F-002 dataGaps
 *               MK-NW-F-017 equitiesTotal · MK-NW-F-018 fixedIncomeTotal
 *               … and 11 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-056 how a holding was classified, and by whom
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-109
 * Changed ..... not in git yet (—)
 */
export function holdingClassOf(p: any): AssetClass {
  // WHAT WAS STORED: the broker's or importer's tag, else the kind the person picked when adding it.
  // NOTHING STORED IS NOT STOCKS / FUNDS (outside review, 2026-10-07): a holding with no tag, no kind
  // and no evidence in its name was filed as Stocks / Funds — an invented answer where his ruling of
  // 2026-09-30 (master Q11, DEC-2160) is 'Refuse the line and ask'. It is Unclassified now.
  const tag = p?.asset_class;
  const byKind = p?.kind ? KIND_TO_CLASS[p.kind] : undefined;
  const stored: AssetClass | null = holdingTagClass(tag)
    ?? (byKind && byKind !== 'real_estate' && byKind !== 'personal_property' ? byKind : null);
  if (p?.class_source === 'user') return stored ?? 'mixed';
  if (p?.class_asked) return 'mixed';
  const byName = holdingNameEvidence(p);
  if (byName && byName !== 'cash') return byName;
  return stored ?? (byName === 'cash' ? 'cash' : 'mixed');
}

/** The class a holding's stored tag stands for — 'bond' Bonds & CDs, 'other' Alternatives, 'cash' Cash,
 *  any other tag Stocks / Funds — or null when nothing is stored. ONE reading, used by MK-NW-F-109
 *  holdingClassOf and MK-NW-F-054 reclassifyAccounts (outside review OpenAI final, 2026-10-09, DEC-2484r). */
/* ─ MK-NW-F-121 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * holdingTagClass
 *
 * Answers ..... The class a holding's stored tag stands for — 'bond' Bonds & CDs, 'other' Alternatives, 'cash' Cash, any other tag Stocks / Funds — or null when nothing is stored.
 *
 * Formula .....
 *     'bonds'   if tag = 'bond'
 *     'alternatives'   if tag = 'other'
 *     'cash'   if tag = 'cash'
 *     'stocks_etf'   if tag
 *     nothing   otherwise   otherwise   otherwise   otherwise
 *
 * Called by ... MK-NW-F-054 reclassifyAccounts · MK-NW-F-109 holdingClassOf
 *
 * Reaches ..... 85 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-079 EF · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-113 altPartsOf
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-019 alternativesTotal
 *               MK-NW-F-029 assetAllocation · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               … and 67 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-121
 * Changed ..... not in git yet (—)
 */
export function holdingTagClass(tag?: string | null): AssetClass | null {
  return tag === 'bond' ? 'bonds' : tag === 'other' ? 'alternatives' : tag === 'cash' ? 'cash' : tag ? 'stocks_etf' : null;
}
/** The tag a holding is stored under for a class — the reverse of holdingTagClass. Gold is 'other'
 *  (Alternatives), never 'stock_etf' (outside review OpenAI final, 2026-10-09, DEC-3035f). */
/* ─ MK-NW-F-122 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * holdingTagFor
 *
 * Answers ..... The tag a holding is stored under for a class — the reverse of holdingTagClass.
 *
 * Formula .....
 *     'bond'   if cls = 'bonds'
 *     'other'   if cls = 'alternatives'
 *     'cash'   if cls = 'cash'
 *     'stock_etf'   if cls = 'stocks_etf'
 *     nothing   otherwise   otherwise   otherwise   otherwise
 *
 * Called by ... MK-NW-F-054 reclassifyAccounts
 *
 * Reaches ..... 85 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-079 EF · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-113 altPartsOf
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-019 alternativesTotal
 *               MK-NW-F-029 assetAllocation · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               … and 67 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-122
 * Changed ..... not in git yet (—)
 */
export function holdingTagFor(cls: AssetClass): 'bond' | 'other' | 'cash' | 'stock_etf' | null {
  return cls === 'bonds' ? 'bond' : cls === 'alternatives' ? 'other' : cls === 'cash' ? 'cash' : cls === 'stocks_etf' ? 'stock_etf' : null;
}
/** What a holding's name (ticker and description together) is evidence for, or null. */
/* ─ MK-NW-F-123 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * holdingNameEvidence
 *
 * Answers ..... What a holding's name (ticker and description together) is evidence for, or null.
 *
 * Formula .....
 *     income bearing class of(`${ticker ?? ''} ${name ?? description ?? label ?? ''}`)
 *
 * Called by ... MK-NW-F-054 reclassifyAccounts · MK-NW-F-109 holdingClassOf
 *
 * Reaches ..... 85 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-079 EF · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-113 altPartsOf
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-019 alternativesTotal
 *               MK-NW-F-029 assetAllocation · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               … and 67 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-123
 * Changed ..... not in git yet (—)
 */
export function holdingNameEvidence(p: any): AssetClass | null {
  return incomeBearingClassOf(`${p?.ticker ?? ''} ${p?.name ?? p?.description ?? p?.label ?? ''}`);
}

/** How much of one account sits in each class, with the parts adding up exactly to the account's balance.
 *  A LINKED account: its uninvested cash is cash; each holding is shares × price under its class
 *  (MK-NW-F-109 holdingClassOf — a money-market fund under Stocks / Funds, a CD under Bonds & CDs);
 *  each option is its value as synced, contracts × price × 100 (owner, Q06), under Alternatives.
 *  If the parts do not reach the balance and a holding has NO PRICE, the difference is that
 *  holding's — filed under its class, or as not yet known when unpriced holdings span classes —
 *  never under cash: an unpriced $1,500 share was being counted as $1,500 of cash, which the
 *  emergency fund then spent (outside review, 2026-10-05). With every holding priced, a difference
 *  no bigger than the larger of $1 or 1% of the balance is cash when positive (owner, DEC-0095) and
 *  comes off the largest class when negative; a bigger one goes under the account's own class.
 *  AN ACCOUNT BUILT BY HAND that records its own uninvested cash: that cash is cash, and the rest
 *  stays whole under the account's class (outside review, 2026-10-05 — it was counted nowhere).
 *  An account with only a typed balance has no answer: nothing is known about what is inside it. */
/* ─ MK-NW-F-027 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountClassBreakdown
 *
 * Answers ..... How much of one account sits in each class, with the parts adding up exactly to the account's balance.
 *
 * Formula .....
 *     out = cash = 0
 *     bonds = 0
 *     stocks etf = 0
 *     alternatives = 0
 *     real estate = 0
 *     personal property = 0
 *     mixed = 0
 *     keeps its own cash = tax bucket ! = 'CASH' and tax bucket ! = 'PROPERTY' and (derive balance = true or cash balance ≠ nothing)
 *     uninvested = cash balance (or 0 when missing)
 *     held = (derive balance = true ? (positions ?? []) : []) as any[]
 *     sh = (lots ?? []).reduce((t: number, l: any) => t + (shares or 0), 0)
 *     paid = (lots ?? []).reduce((t: number, l: any) => t + (shares or 0) × (cost per share or 0), 0)
 *     the answer:
 *     cls = holding class of(p)
 *     w = sh × last price   if last price ≠ nothing
 *     value now   if value now ≠ nothing
 *     paid   otherwise   otherwise
 *     classes = a list with no repeats of for each of weights: cls
 *     splits by holding = classes.size > 1 (or classes.size = 1 and !classes.has(asset class of(a)) when missing or zero)
 *     nothing   when !(keeps its own cash and uninvested > 0) and !splits by holding
 *     invested = (balance or 0) − out.cash
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-015 totalAssets · MK-NW-F-016 cashTotal
 *               MK-NW-F-029 assetAllocation · MK-NW-F-094 ledgerGroups
 *               MK-NW-F-113 altPartsOf · MK-NW-O-002 theAccount
 *
 * Reaches ..... 24 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-079 EF · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-113 altPartsOf · MK-NW-F-002 alternativesSummary
 *               MK-NW-F-019 alternativesTotal · MK-NW-F-029 assetAllocation
 *               MK-NW-F-016 cashTotal · MK-NW-F-017 equitiesTotal
 *               MK-NW-F-018 fixedIncomeTotal · MK-NW-F-022 investableAssets
 *               MK-NW-F-021 investmentsTotal · MK-NW-F-094 ledgerGroups
 *               … and 6 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *
 * Decides .....
 *     · If cash balance is missing it uses 0.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If cost per share is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-027
 * Changed ..... 2026-08-17 (cf71d68)
 */
export function accountClassBreakdown(a: AssetAccount): Record<AssetClass, number> | null {
  const out: Record<AssetClass, number> = { cash: 0, bonds: 0, stocks_etf: 0, alternatives: 0, real_estate: 0, personal_property: 0, mixed: 0 };
  if (a.source !== 'connected') {
    // BUILT BY HAND. The account keeps its own uninvested cash only when its balance is built from
    // its records (the same test MK-CF-F-134 usesSleeve applies). A sum above zero is money that came
    // in and has not been invested; below zero is a purchase recorded without its deposit — not cash,
    // and not a loan — so the account stays whole.
    const keepsItsOwnCash = a.tax_bucket !== 'CASH' && a.tax_bucket !== 'PROPERTY' && (a.derive_balance === true || a.cash_balance != null);
    const uninvested = a.cash_balance ?? 0;
    // EACH HOLDING UNDER ITS OWN CLASS (outside review, 2026-10-07). A hand-built account's balance is
    // its cash plus its holdings, so its holdings can be split exactly — the rest used to be filed whole
    // under the account's own class, so a T-bill in a hand-built brokerage counted as Stocks / Funds
    // (his rule DEC-0051: a T-bill is Bonds & CDs). Each holding is weighed at its price, or at what was
    // paid when no price is held (the same fallback the balance itself uses, B-19), and the weights
    // share out exactly what is invested — so the parts still add to the balance.
    const held = (a.derive_balance === true ? (a.positions ?? []) : []) as any[];
    const weights = held.map((p) => {
      const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
      const paid = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0) * (l.cost_per_share || 0), 0);
      // today's value: the broker's mark, else the value the balance was built from, else what was paid
      return { cls: holdingClassOf(p), w: p.last_price != null ? sh * p.last_price : p.value_now != null ? p.value_now : paid };
    }).filter((x) => x.w > 0);
    const classes = new Set(weights.map((x) => x.cls));
    const splitsByHolding = classes.size > 1 || (classes.size === 1 && !classes.has(assetClassOf(a)));
    if (!(keepsItsOwnCash && uninvested > 0) && !splitsByHolding) return null;
    out.cash = keepsItsOwnCash && uninvested > 0 ? Math.min(uninvested, Math.max(0, a.balance || 0)) : 0;
    const invested = (a.balance || 0) - out.cash;
    const totalW = weights.reduce((t, x) => t + x.w, 0);
    if (splitsByHolding && totalW > 0) {
      for (const x of weights) out[x.cls] += invested * (x.w / totalW);
    } else {
      out[assetClassOf(a)] += invested;
    }
    return out;
  }
  out.cash += (a as any).cash_balance ?? 0;
  // FOUNDER RULE 2026-08-04, applied HERE 2026-08-11: cash means cash only. A broker tags VMFXX as
  // 'cash' and a CD as 'cash' too; the name decides instead (holdingClassOf). This used to live ONLY
  // in the one-time migration over stored data, so a position synced AFTER the migration ran landed
  // back in Cash — the same defect as the founder's original CD-under-Cash finding, mirrored in time.
  const unpriced = new Set<AssetClass>();
  for (const p of (a.positions ?? []) as any[]) {
    const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
    const cls = holdingClassOf(p);
    if (p.last_price == null) { if (sh !== 0) unpriced.add(cls); continue; }
    out[cls] += sh * p.last_price;
  }
  for (const o of ((a as any).option_holdings ?? []) as any[]) out.alternatives += o.value || 0;
  (Object.keys(out) as AssetClass[]).forEach((k) => { out[k] = (out[k]); });
  const sum = ((Object.values(out) as number[]).reduce((t, v) => t + v, 0));
  const r = ((a.balance || 0) - sum);
  if (r !== 0) {
    if (r > 0 && unpriced.size > 0) {
      // A HOLDING WITH NO PRICE IS NOT WORTH NOTHING. The broker's total counts it and the parts
      // above do not, so the difference is that holding's value on the best evidence there is —
      // filed under its class. Where unpriced holdings span classes the split between them is not
      // known, and it is said so (not yet known) rather than guessed.
      const cls: AssetClass = unpriced.size === 1 ? [...unpriced][0] : 'mixed';
      out[cls] = (out[cls] + r);
    } else if (Math.abs(r) <= Math.max(1, 0.01 * Math.abs(a.balance || 0))) {
      // FOUNDER FINDING 2026-08-11 ("why is cash added to CD and not cash?"): this leftover used to
      // be added to the LARGEST class, so on a CD-heavy account the uninvested money was counted as
      // MORE CDs — overstating the bonds slice and understating cash, both silently.
      //
      // A POSITIVE leftover is money the broker's total includes but its holdings do not account
      // for. In a brokerage that is uninvested money: settlement cash, a dividend just received,
      // a pending trade. Calling it cash is nearly always true; calling it "more CDs" is a claim
      // about what you OWN that we cannot support.
      //
      // A NEGATIVE leftover means the priced holdings exceed the broker's stated total — a pricing
      // or rounding artifact, not money. That still lands on the largest class, because writing it
      // into cash would show a negative cash balance, which is worse than a rounding nudge.
      if (r > 0) {
        out.cash = (out.cash + r);
      } else {
        const largest = (Object.keys(out) as AssetClass[]).sort((x, y) => out[y] - out[x])[0];
        out[largest] = (out[largest] + r);
      }
    } else {
      // 2026-08-10, same class of defect as the founder's CD-under-Cash finding: a CONNECTED account
      // that sends no position detail (a CD ladder, a Treasuries account, a savings account) was
      // dumped whole into Unclassified even when we know exactly what it is — its own explicit class,
      // its CD/T-bill label or its kind. Only a wrapper whose contents are genuinely unknown
      // (assetClassOf === 'mixed': a bare 401(k)/IRA/brokerage) may land in Unclassified.
      const own = assetClassOf(a);
      const bucket: AssetClass = own === 'mixed' ? 'mixed' : own;
      out[bucket] = (out[bucket] + r);
    }
  }
  return out;
}

const CD_RE = /\b(cd|certificate of deposit)\b/i;
// broker wording too — 'UNITED STATES TREAS BILLS', 'US TREAS NT', 'UST' (outside review, 2026-10-07).
// 'government' / 'govt' are NOT Treasury words: an agency or a foreign government bond is not a US
// Treasury — 'US Government Agency 2032' is a bond (outside review OpenAI final, 2026-10-09, DEC-3035g)
const TREASURY_RE = /\b(treasur\w*|treas|ust|t-?bills?|t-?notes?|t-?bonds?)\b/i;

/** Writes a count with its noun, singular for one and plural otherwise: 1 CD, 3 CDs. */
/* ─ MK-NW-F-067 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * plural
 *
 * Answers ..... Writes a count with its noun, singular for one and plural otherwise: 1 CD, 3 CDs.
 *
 * Formula .....
 *     the answer = n + ' ' + (one   when n = 1;   many   otherwise)
 *
 * Called by ... MK-NW-F-028 classPortionLabel · MK-NW-F-046 historyCoverage
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-028 classPortionLabel
 *               MK-XS-F-002 dataGaps · MK-NW-F-046 historyCoverage
 *               MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-067
 * Changed ..... not in git yet (—)
 */
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The words under an account's name saying what it holds of one class — "3 CDs & 1 Treasury in this account".
 *  Founder finding 2026-08-11 (DEC-0090): it used to repeat the class name the row already carried.
 *  It COUNTS what is in there instead, and counts the same holdings the dollars beside it were split
 *  by (MK-NW-F-109 holdingClassOf). A count of one is singular, a count of zero is left out, three
 *  parts read "1 CD, 1 Treasury & 2 bonds". A CD or a Treasury is told by a whole word in its name,
 *  capitals ignored — "ABCD Industries" is not a CD. Where two things cannot be told apart (a ticker
 *  does not say a share from a fund) the broader word is used rather than a guessed split. */
/* ─ MK-NW-F-028 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * classPortionLabel
 *
 * Answers ..... The words under an account's name saying what it holds of one class — "3 CDs & 1 Treasury in this account".
 *
 * Formula .....
 *     pos = (positions ?? []) as any[]
 *     in class = pos where holding class of(each) = cls
 *     name of = (p: any) => `${ticker ?? ''} ${name ?? label ?? ''}`
 *     joined = the first -1).join(', ')} & ${parts[parts.length − 1]}` of (parts: string[]) => (parts.length ≤ 2 ? parts.join(' & ') : `${parts
 *     opts = count of ((a as any).option holdings ?? []) as any[]
 *     cds = in class where CD_RE.test(name of(each))count of
 *     treas = in class where !CD_RE.test(name of(each)) and TREASURY_RE.test(name of(each))count of
 *     rest = in class.length − cds − treas
 *     the answer:
 *     `${joined(parts)} in this account`   if count of parts
 *     'bonds & cds in this account'   otherwise
 *     parts = [opts ? plural(opts, 'option') : '', in class.length ? plural(in class.length, 'holding') : ''] where boolean
 *
 * Called by ... MK-NW-O-005 theAlternativesOutlook
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-O-005 theAlternativesOutlook
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-028
 * Changed ..... 2026-08-17 (cf71d68)
 */
export function classPortionLabel(a: AssetAccount, cls: AssetClass): string {
  const pos = ((a.positions ?? []) as any[]);
  const inClass = pos.filter((p) => holdingClassOf(p) === cls);   // the same test the dollars beside these words were split by
  const nameOf = (p: any) => `${p.ticker ?? ''} ${p.name ?? p.label ?? ''}`;
  // "3 CDs & 1 Treasury" · "1 CD, 1 Treasury & 2 bonds" — commas, then one "&" before the last
  const joined = (parts: string[]) => (parts.length <= 2 ? parts.join(' & ') : `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`);
  const opts = (((a as any).option_holdings ?? []) as any[]).length;

  switch (cls) {
    // Cash is CASH ONLY (founder rule 2026-08-04): money-market funds live under Stocks / Funds and
    // CDs / T-bills under Bonds & CDs, because they pay dividends and interest that must be measured.
    // So a cash slice is the sweep balance — one line, said plainly.
    case 'cash': return 'cash in this account';
    case 'bonds': {
      const cds = inClass.filter((p) => CD_RE.test(nameOf(p))).length;
      const treas = inClass.filter((p) => !CD_RE.test(nameOf(p)) && TREASURY_RE.test(nameOf(p))).length;
      const rest = inClass.length - cds - treas;
      const parts = [
        cds ? plural(cds, 'CD') : '',
        treas ? plural(treas, 'Treasury', 'Treasuries') : '',
        rest ? plural(rest, 'bond') : '',
      ].filter(Boolean);
      return parts.length ? `${joined(parts)} in this account` : 'bonds & CDs in this account';
    }
    case 'stocks_etf': {
      // a ticker alone cannot tell a share from a fund — one honest word covers both
      return inClass.length ? `${plural(inClass.length, 'holding')} in this account` : 'stocks & funds in this account';
    }
    case 'alternatives': {
      const parts = [opts ? plural(opts, 'option') : '', inClass.length ? plural(inClass.length, 'holding') : ''].filter(Boolean);
      return parts.length ? `${joined(parts)} in this account` : 'alternatives in this account';
    }
    default: return 'unpriced portion of this account';
  }
}

/* ─ MK-NW-F-029 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * assetAllocation
 *
 * Answers ..... How much money sits in each of the seven classes?
 *
 * Formula .....
 *     out = cash = 0
 *     bonds = 0
 *     stocks etf = 0
 *     alternatives = 0
 *     real estate = 0
 *     personal property = 0
 *     mixed = 0
 *     b = account class breakdown(a)
 *     the answer = out
 *
 * Called by ... MK-NW-F-016 cashTotal · MK-NW-F-017 equitiesTotal
 *               MK-NW-F-018 fixedIncomeTotal · MK-NW-F-019 alternativesTotal
 *               MK-NW-F-020 realEstateTotal · MK-NW-F-021 investmentsTotal
 *               MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-NW-F-019 alternativesTotal · MK-NW-F-016 cashTotal
 *               MK-NW-F-017 equitiesTotal · MK-NW-F-018 fixedIncomeTotal
 *               MK-NW-F-021 investmentsTotal · MK-NW-F-020 realEstateTotal
 *               MK-NW-O-004 theEmergencyFund · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-029
 * Changed ..... 2026-07-19 (6c94acf)
 */
export function assetAllocation(accounts: AssetAccount[]): Record<AssetClass, number> {
  const out: Record<AssetClass, number> = { cash: 0, bonds: 0, stocks_etf: 0, alternatives: 0, real_estate: 0, personal_property: 0, mixed: 0 };
  for (const a of accounts ?? []) {
    const b = accountClassBreakdown(a);
    if (b) (Object.keys(out) as AssetClass[]).forEach((k) => { out[k] += b[k]; });
    else out[assetClassOf(a)] += (a.balance || 0);
  }
  (Object.keys(out) as AssetClass[]).forEach((k) => { out[k] = (out[k]); });
  return out;
}

// B-70: the duplicate `investableValue` (excluded only the PROPERTY tax-bucket) was removed — every
// screen now uses the canonical `investableAssets` above (excludes real_estate + personal_property by
// asset CLASS, the taxonomy definition).

/** Default % of an account that's earmarked for retirement (rest funds other goals). */
/** FOUNDER RULE 2026-08-11 — what counts toward retirement by default:
 *      EVERYTHING you own, except your primary home and your primary car.
 *  Cash counts (it is money you can spend), a rental counts (you can sell it), a second car counts.
 *  Only the roof you live under and the car you drive are assumed off the table, because selling
 *  those is not a retirement plan. Any of it can be changed per account — `retirement_pct` always
 *  wins over this default, and the Plan tab is where a person changes it.
 *
 *  A 529 stays out: that money is legally earmarked for someone else's education, not a choice.
 *  `primaryCarId` names the one vehicle treated as the car you drive (the most valuable one) —
 *  callers pass it so a household with two cars keeps the second as a real asset. */
/* ─ MK-NW-F-030 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * earmarkDefault
 *
 * Answers ..... Default % of an account that's earmarked for retirement (rest funds other goals).
 *
 * Formula .....
 *     0   when kind = 'college_529'
 *     0   if string(asset id) = primary home id
 *     100   otherwise   when primary home id ! = undefined
 *     0   if re use = 'primary'
 *     100   otherwise   when re use
 *     0
 *     0   when asset id = primary car id
 *
 * Called by ... MK-NW-F-032 earmarkedAmount · MK-NW-F-110 primaryHomeIdOf
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-037 blendedReturn
 *               MK-NW-F-035 blendedVolatility · MK-CF-F-107 buildPaycheckYear
 *               MK-XS-F-031 buildSnapshot · MK-PL-F-077 clamp
 *               MK-NW-F-032 earmarkedAmount · MK-NW-F-038 earmarkedKinds
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-026 planDoor
 *               MK-NW-F-004 portfolioActualReturn · MK-NW-F-110 primaryHomeIdOf
 *               MK-NW-F-033 retirementEarmarkedValue · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               … and 4 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-030
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function earmarkDefault(a: AssetAccount, primaryCarId?: string, primaryHomeId?: string | null): number {
  if (a.kind === 'college_529') return 0;               // not the household's to spend
  if (assetClassOf(a) === 'real_estate') {
    // the home you live in (owner, 2026-08-11, DEC-0100). Told the household's home (an id), only it is
    // 0; told the household has none (null), none is; told nothing (undefined), the old reading of one
    // account alone: stated use, else the home
    if (primaryHomeId !== undefined) return String(a.asset_id) === primaryHomeId ? 0 : 100;
    if (a.re_use) return a.re_use === 'primary' ? 0 : 100;
    return 0;
  }
  if (a.asset_id === primaryCarId) return 0;            // the car you drive
  return 100;                                           // everything else is money that could fund retirement
}

/** The vehicle treated as "the car you drive" — the most valuable one, so a second car stays a real
 *  asset. Ties break on id, so the choice never shuffles between renders. */
/* ─ MK-NW-F-031 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * primaryCarIdOf
 *
 * Answers ..... The vehicle treated as "the car you drive" — the most valuable one, so a second car stays a real asset.
 *
 * Formula .....
 *     cars = accounts (or none when missing) where kind = 'vehicle'
 *     undefined   when count of cars is missing
 *     the answer = [...cars].sort((x, y) => (balance or 0) − (balance or 0) or (string(asset id) < string(asset id) ? -1 : string(asset id) > string(asset id) ? 1 : 0))[0].asset id
 *
 * Called by ... MK-NW-F-033 retirementEarmarkedValue · MK-NW-F-035 blendedVolatility
 *               MK-NW-F-037 blendedReturn · MK-PL-F-001 taxBucketSplit
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-037 blendedReturn
 *               MK-NW-F-035 blendedVolatility · MK-CF-F-107 buildPaycheckYear
 *               MK-XS-F-031 buildSnapshot · MK-PL-F-077 clamp
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-026 planDoor
 *               MK-NW-F-033 retirementEarmarkedValue · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               MK-NW-O-005 theAlternativesOutlook · MK-NW-F-003 valueFreshness
 *               MK-PL-F-065 volOf · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-031
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function primaryCarIdOf(accounts: AssetAccount[]): string | undefined {
  // A CAR, ONLY. This used to pick from every Personal property account, so a jewellery collection worth
  // more than the car became "the car you drive" and the real car fell to the 100% default (outside
  // review, 2026-10-07). Ties go to the lower id read as text — the one made first, on every device.
  const cars = (accounts ?? []).filter((a) => a.kind === 'vehicle');
  if (!cars.length) return undefined;
  return [...cars].sort((x, y) => (y.balance || 0) - (x.balance || 0) || (String(x.asset_id) < String(y.asset_id) ? -1 : String(x.asset_id) > String(y.asset_id) ? 1 : 0))[0].asset_id;
}
/** The retirement-earmarked $ for one account (uses the saved % or the smart default). */
/* ─ MK-NW-F-032 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * earmarkedAmount
 *
 * Answers ..... The retirement-earmarked $ for one account (uses the saved % or the smart default).
 *
 * Formula .....
 *     pct = earmark default(a, primary car id, primary home id)   if retirement pct = nothing
 *     retirement pct   otherwise
 *     the answer = (balance or 0) × max(0, min(100, pct)) ÷ 100
 *
 * Called by ... MK-NW-F-004 portfolioActualReturn · MK-NW-F-033 retirementEarmarkedValue
 *               MK-NW-F-035 blendedVolatility · MK-NW-F-037 blendedReturn
 *               MK-NW-F-038 earmarkedKinds · MK-PL-F-001 taxBucketSplit
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-037 blendedReturn
 *               MK-NW-F-035 blendedVolatility · MK-CF-F-107 buildPaycheckYear
 *               MK-XS-F-031 buildSnapshot · MK-PL-F-077 clamp
 *               MK-NW-F-038 earmarkedKinds · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-026 planDoor · MK-NW-F-004 portfolioActualReturn
 *               MK-NW-F-033 retirementEarmarkedValue · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               MK-NW-O-005 theAlternativesOutlook · MK-NW-F-003 valueFreshness
 *               … and 2 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-050 the share of an account earmarked for retirement
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Caps percent at 100.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-032
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function earmarkedAmount(a: AssetAccount, primaryCarId?: string, primaryHomeId?: string | null): number {
  const pct = a.retirement_pct == null ? earmarkDefault(a, primaryCarId, primaryHomeId) : a.retirement_pct;
  return ((a.balance || 0) * Math.max(0, Math.min(100, pct)) / 100);
}
/** Total nest egg = sum of each account's retirement-earmarked portion. This — not net worth — funds retirement. */
/* ─ MK-NW-F-033 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * retirementEarmarkedValue
 *
 * Answers ..... Total nest egg = sum of each account's retirement-earmarked portion.
 *
 * Formula .....
 *     car = primary car id of(accounts), home = primary home id of(accounts)
 *     the answer = Σ over accounts (or none when missing) of (earmarked amount(each, car, home))
 *
 * Called by ... MK-CF-F-107 buildPaycheckYear · MK-PL-F-026 planDoor
 *               MK-PL-F-067 willItLastInputs · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-031 buildSnapshot
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-026 planDoor
 *               MK-PL-F-068 selectWillItLast · MK-XS-F-032 snapshotFromOnboarding
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-033
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function retirementEarmarkedValue(accounts: AssetAccount[]): number {
  const car = primaryCarIdOf(accounts), home = primaryHomeIdOf(accounts);
  return ((accounts ?? []).reduce((t, a) => t + earmarkedAmount(a, car, home), 0));
}

/** Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default. */
/* ─ MK-NW-F-034 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * benchmarkReturn
 *
 * Answers ..... Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default.
 *
 * Formula .....
 *     overrides[kind]   when kind and overrides and overrides[kind] ≠ nothing
 *     asset kind(kind).ret (or 0.06 when missing)
 *
 * Called by ... MK-NW-F-002 alternativesSummary · MK-NW-F-036 benchmarkInfo
 *               MK-NW-F-037 blendedReturn · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-O-005 theAlternativesOutlook
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-002 alternativesSummary
 *               MK-NW-F-036 benchmarkInfo · MK-NW-F-037 blendedReturn
 *               MK-NW-F-052 buildItemizedAccounts · MK-XS-F-031 buildSnapshot
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-NW-O-005 theAlternativesOutlook
 *               MK-NW-F-003 valueFreshness · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If return is missing it uses 6%.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-034
 * Changed ..... 2026-08-11 (07be308)
 */
export function benchmarkReturn(kind: string | undefined, overrides?: Record<string, number>): number {
  if (kind && overrides && overrides[kind] != null) return overrides[kind];
  return assetKind(kind)?.ret ?? 0.06;
}

/** Where each benchmark return comes from + the window it's measured over. NOMINAL (the retirement
 *  function applies inflation separately). `estimate: true` = no clean 30-yr index series exists, so the
 *  figure is a flagged estimate, not an actual historical return. Historical figures are through 2025;
 *  past performance is not a guarantee of future results. */
/** ANNUAL VOLATILITY (standard deviation) per asset kind — how much a year's return typically swings
 *  around its average. Added 2026-08-11: the retirement odds used to derive volatility from the
 *  return with `return × 1.7`, a rule of thumb that made a cash-heavy pot look almost risk-free and
 *  could not express that bonds and stocks move differently. These come from the SAME long-run
 *  series as the returns above, so a portfolio's risk is measured, not guessed. */
export const KIND_VOLATILITY: Record<string, number> = {
  checking: 0.005, savings: 0.01, hysa: 0.012, money_market: 0.01, cd: 0.012, cash_mgmt: 0.012,
  brokerage: 0.14, stocks_etf: 0.18, fixed_income: 0.06, crypto: 0.70,
  private_equity: 0.20, hedge_funds: 0.08, commodities: 0.16, options: 0.35,
  annuities: 0.02, college_529: 0.12, other_asset: 0.12,
  '401k': 0.11, trad_ira: 0.11, roth_ira: 0.11, hsa: 0.11,
  home: 0.10, vehicle: 0.05,
};
export const VOLATILITY_META: Record<string, { source: string; period: string; estimate?: boolean }> = {
  savings: { source: '3-mo Treasury bill, annual std dev', period: '30-yr' },
  stocks_etf: { source: 'S&P 500 annual std dev', period: '30-yr' },
  fixed_income: { source: 'US Aggregate Bond index, annual std dev', period: '30-yr' },
  brokerage: { source: 'Blended taxable portfolio', period: '30-yr', estimate: true },
  crypto: { source: 'No long-run series — a wide placeholder', period: '—', estimate: true },
  private_equity: { source: 'Cambridge Associates US PE (smoothed — true swing is wider)', period: '~25-yr', estimate: true },
  hedge_funds: { source: 'HFRI Fund Weighted Composite', period: '~10-yr', estimate: true },
  commodities: { source: 'Gold, annual std dev', period: '30-yr' },
  '401k': { source: '60/40 mix, annual std dev', period: '30-yr', estimate: true },
  trad_ira: { source: '60/40 mix, annual std dev', period: '30-yr', estimate: true },
  roth_ira: { source: '60/40 mix, annual std dev', period: '30-yr', estimate: true },
  hsa: { source: '60/40 mix, annual std dev', period: '30-yr', estimate: true },
  home: { source: 'Case-Shiller US home price, annual std dev', period: '30-yr' },
};

/** The volatility of THIS portfolio — each account's own class volatility, weighted the way the
 *  money actually is (the same weighting `blendedReturn` uses, so the pair always describes one
 *  portfolio). Weighted-average volatility assumes the parts move together, which slightly
 *  OVERSTATES risk for a mixed portfolio; overstating risk makes the odds cautious rather than
 *  flattering, which is the side to err on. Falls back to the scenario rule when nothing is held. */
/* ─ MK-NW-F-035 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * blendedVolatility
 *
 * Answers ..... The volatility of THIS portfolio — each account's own class volatility, weighted the way the money actually is (the same weighting `blendedReturn` uses, so the pair always describes one portfolio).
 *
 * Formula .....
 *     car = primary car id of(accounts), home = primary home id of(accounts)
 *     items = accounts (or none when missing)
 *     total = Σ over items of (earmarked amount(each, car, home))
 *     nothing   when total ≤ 0
 *     v = overrides[kind]   if kind and overrides.[kind] ≠ nothing
 *     KIND_VOLATILITY[kind]   if kind
 *     undefined   otherwise   otherwise
 *     the answer = t + (v ?? 0.12) × earmarked amount(a, car, home)
 *
 * Called by ... MK-PL-F-067 willItLastInputs · MK-PL-F-077 clamp
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-077 clamp · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-065 volOf · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-035 annuity income
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If v is missing it uses 12%.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-035
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function blendedVolatility(accounts: AssetAccount[], overrides?: Record<string, number>): number | null {
  const car = primaryCarIdOf(accounts), home = primaryHomeIdOf(accounts);
  const items = accounts ?? [];   // the same money the nest egg counts (2026-10-07) — see blendedReturn
  const total = items.reduce((t, a) => t + earmarkedAmount(a, car, home), 0);
  if (total <= 0) return null;    // nothing set aside, no portfolio to measure — the 12% here was invented (outside review, 2026-10-07)
  // A WEIGHTED AVERAGE OF THE PARTS' VOLATILITIES, which is the portfolio's only when the parts move
  // together. The outside review (2026-10-07) is right that a table of how the classes move together
  // would give a lower, truer figure; the app has no such table yet, so this stays the average until
  // the Plan build decides one (on the tracker).
  const weighted = items.reduce((t, a) => {
    const v = (a.kind && overrides?.[a.kind] != null) ? overrides[a.kind] : (a.kind ? KIND_VOLATILITY[a.kind] : undefined);
    return t + (v ?? 0.12) * earmarkedAmount(a, car, home);
  }, 0);
  return ((weighted / total));
}

export const BENCHMARK_META: Record<string, { source: string; period: string; estimate?: boolean }> = {
  checking:       { source: 'Interest checking, ~0%', period: 'current', estimate: true },
  savings:        { source: '3-mo Treasury bill (cash)', period: '30-yr' },
  stocks_etf:     { source: 'S&P 500 total return', period: '30-yr' },
  fixed_income:   { source: 'US Aggregate Bond index', period: '30-yr' },
  private_equity: { source: 'Cambridge Associates US PE', period: '~25-yr', estimate: true },
  hedge_funds:    { source: 'HFRI Fund Weighted Composite', period: '~10-yr', estimate: true },
  commodities:    { source: 'Gold (SPDR GLD)', period: '30-yr' },
  crypto:         { source: 'No long-run benchmark — set your own', period: '—', estimate: true },
  annuities:      { source: 'Typical fixed-annuity rate', period: 'current', estimate: true },
  college_529:    { source: 'Age-based 529 blend', period: 'assumed', estimate: true },
  '401k':         { source: 'Assumed 60/40 mix', period: '30-yr', estimate: true },
  trad_ira:       { source: 'Assumed 60/40 mix', period: '30-yr', estimate: true },
  roth_ira:       { source: 'Assumed 60/40 mix', period: '30-yr', estimate: true },
  hsa:            { source: 'Invested HSA, assumed 60/40', period: '30-yr', estimate: true },
  home:           { source: 'Case-Shiller US home price (nominal)', period: '30-yr' },
  vehicle:        { source: 'Vehicle depreciation', period: 'annual', estimate: true },
  other_asset:    { source: 'Generic blended estimate', period: '—', estimate: true },
};
/** Benchmark return + its source/period for an asset kind. `edited` flags a user override;
 *  `estimate` flags that there's no clean 30-yr series so the figure is an estimate. */
/* ─ MK-NW-F-036 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * benchmarkInfo
 *
 * Answers ..... Benchmark return + its source/period for an asset kind.
 *
 * Formula .....
 *     meta = BENCHMARK_META[kind ?? ''] (or source = 'generic blended estimate'
 *     period = '—'
 *     estimate = true when missing)
 *     edited = !!(kind and overrides and overrides[kind] ≠ nothing)
 *     the answer:
 *     ret = benchmark return(kind, overrides)
 *     source = 'your custom estimate'   if edited
 *     meta.source   otherwise
 *     period = '—'   if edited
 *     meta.period   otherwise
 *     edited = edited
 *     estimate = edited (or !!meta.estimate when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-036
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function benchmarkInfo(kind: string | undefined, overrides?: Record<string, number>): { ret: number; source: string; period: string; edited: boolean; estimate: boolean } {
  const meta = BENCHMARK_META[kind ?? ''] ?? { source: 'Generic blended estimate', period: '—', estimate: true };
  const edited = !!(kind && overrides && overrides[kind] != null);
  // a rate the person set is their own assumption, not a measured index — an estimate (outside review, 2026-10-07)
  return { ret: benchmarkReturn(kind, overrides), source: edited ? 'Your custom estimate' : meta.source, period: edited ? '—' : meta.period, edited, estimate: edited || !!meta.estimate };
}
/** Blended expected return across the EARMARKED nest egg, weighted by each holding's share.
 *  Different asset types earn different returns — equity vs bonds vs PE vs hedge funds — so the
 *  nest egg's growth rate is the value-weighted average of their benchmarks. */
/* ─ MK-NW-F-037 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * blendedReturn
 *
 * Answers ..... Blended expected return across the EARMARKED nest egg, weighted by each holding's share.
 *
 * Formula .....
 *     car = primary car id of(accounts), home = primary home id of(accounts)
 *     items = accounts (or none when missing)
 *     total = Σ over items of (earmarked amount(each, car, home))
 *     nothing   when total ≤ 0
 *     weighted = Σ over items of (benchmark return(kind, overrides) × earmarked amount(each, car, home))
 *     the answer = weighted ÷ total
 *
 * Called by ... MK-NW-F-003 valueFreshness · MK-NW-O-005 theAlternativesOutlook
 *               MK-PL-F-067 willItLastInputs · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-XS-F-031 buildSnapshot
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-NW-O-005 theAlternativesOutlook
 *               MK-NW-F-003 valueFreshness · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-037
 * Changed ..... 2026-08-11 (83acb7e)
 */
export function blendedReturn(accounts: AssetAccount[], overrides?: Record<string, number>): number | null {
  // OVER EXACTLY THE MONEY THE NEST EGG COUNTS (outside review, 2026-10-07). Property was left out here
  // while MK-NW-F-033 retirementEarmarkedValue counts a rental at 100% — so a $520,000 rental was grown
  // at a rate made only from the 401(k) and the savings. The home lived in and the car driven weigh
  // nothing (their default share is 0), so they fall out on their own. And with nothing set aside
  // there is no blended return: the 6% that stood here was an invented figure.
  const car = primaryCarIdOf(accounts), home = primaryHomeIdOf(accounts);
  const items = accounts ?? [];
  const total = items.reduce((t, a) => t + earmarkedAmount(a, car, home), 0);
  if (total <= 0) return null;
  const weighted = items.reduce((t, a) => t + benchmarkReturn(a.kind, overrides) * earmarkedAmount(a, car, home), 0);
  return ((weighted / total));
}
/** Distinct investment kinds present in the earmarked nest egg (for the benchmark editor). */
/* ─ MK-NW-F-038 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * earmarkedKinds
 *
 * Answers ..... Distinct investment kinds present in the earmarked nest egg (for the benchmark editor).
 *
 * Formula .....
 *     seen = new set<string>()
 *     the answer = array.from(seen)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses a built-in d e f a u l t r e t u r n of 7%.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-038
 * Changed ..... 2026-06-05 (f742136)
 */
export function earmarkedKinds(accounts: AssetAccount[]): string[] {
  const seen = new Set<string>();
  (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY' && earmarkedAmount(a) > 0).forEach((a) => seen.add(a.kind || 'other_asset'));
  return Array.from(seen);
}
export interface AssetsDoc { user_id: UserId; accounts: AssetAccount[]; last_updated?: any; }

export interface AssetsState {
  user_id: UserId;
  total_asset_value: number;
  average_target_return: number | null;   // null when nothing is held
  accounts: (AssetAccount & { portfolio_percentage: number })[];
}

const DEFAULT_RETURN = 0.07;

/* ─ MK-NW-F-039 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildAssetsState
 *
 * Answers ..... How much of everything sits in each account, and what return do they blend to?
 *
 * Formula .....
 *     total asset value      = round(Σ over every account of (balance), 2 dp)
 *     share of portfolio (a) = round(balance of a ÷ total × 100, 2 dp)
 *     average target return  = round(Σ(target return × balance) ÷ total, 4 dp)
 *
 * Called by ... MK-NW-F-111 assetsStateFrom · MK-NW-O-003 theNetWorth
 *               MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-111 assetsStateFrom
 *               MK-XS-F-031 buildSnapshot · MK-NW-F-044 getAssetsState
 *               MK-XS-F-032 snapshotFromOnboarding · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-028 assumed return
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-039
 * Changed ..... 2026-06-05 (f742136)
 */
export function buildAssetsState(uid: UserId, accounts: AssetAccount[]): AssetsState {
  // A BALANCE THAT IS NOT THERE IS LEFT OUT — null or absent alike; an absent one made What you own
  // and Net worth NaN. The amber box (dataGaps 'no-balance') names it (outside review OpenAI final,
  // 2026-10-09, DEC-3279e)
  const balOf = (a: AssetAccount): number => (a.balance != null && Number.isFinite(a.balance as number) ? (a.balance as number) : 0);
  const total = accounts.reduce((t, a) => t + balOf(a), 0);
  const withPct = accounts.map((a) => ({
    ...a, portfolio_percentage: total > 0 ? ((balOf(a) / total) * 100) : 0,
  }));
  // no accounts, no average: the 7% that stood here was a return for a household that owns nothing
  // (outside review, 2026-10-07)
  const avg = total > 0
    ? accounts.reduce((t, a) => t + (balOf(a) ? a.target_return * balOf(a) : 0), 0) / total
    : null;
  return { user_id: uid, total_asset_value: (total), average_target_return: (avg), accounts: withPct };
}

/** Build asset accounts from onboarding answers (accumulation: retirement savings + holdings). */
/* ─ MK-NW-F-040 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * assetsFromOnboarding
 *
 * Answers ..... Build asset accounts from onboarding answers (accumulation: retirement savings + holdings).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     accounts = []
 *     bal = raw read as a number (0 when it is not one)
 *     the answer:
 *     user id = uid
 *     accounts = accounts
 *
 * Called by ... MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-033 resolveNetWorthRows
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-111 assetsStateFrom · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-040
 * Changed ..... 2026-06-13 (e77e5a3)
 */
export function assetsFromOnboarding(uid: UserId, op: Record<string, any> | null): AssetsDoc {
  const a = op ?? {};
  const accounts: AssetAccount[] = [];
  // B-21: seed an account when the question was ANSWERED — including an explicit $0, so the user
  // has a placeholder to fund/edit later. Key on field presence, not the value: an absent field
  // (e.g. currentSavingsPortfolio in the accumulation flow) must NOT spawn a junk $0 account.
  const add = (label: string, bucket: TaxBucket, raw: any, kind: string) => {
    if (raw == null || String(raw).trim() === '') return; // question not asked / left blank → no account
    const bal = toNum(raw);
    if (bal < 0) return; // guard negatives
    accounts.push({ asset_id: newEntityId('ast'), label, kind, tax_bucket: bucket, balance: bal, target_return: DEFAULT_RETURN, origin: 'onboarding' });
  };
  add('Retirement (Traditional)', 'PRE_TAX', a.currentRetirementSavings, '401k');        // #8: pre-tax — taxed on withdrawal
  add('Retirement (Roth)', 'ROTH', a.currentRetirementSavingsRoth, 'roth_ira');           // #8: after-tax — tax-free in retirement
  add('Investments', 'TAXABLE', a.investmentHoldings, 'stocks_etf');
  add('Savings / portfolio', 'TAXABLE', a.currentSavingsPortfolio, 'stocks_etf'); // retired flow (if present)
  return { user_id: uid, accounts };
}

/** Total monthly contributions across types + employer match (feeds the retirement projection). */
/* ─ MK-NW-F-041 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthlyContributionsFromOnboarding
 *
 * Answers ..... Total monthly contributions across types + employer match (feeds the retirement projection).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     nothing   when !['c_401k', 'c_roth', 'c_invest', 'employerMatchValue'].some((k) => string(a[k] ?? '').trim() ! = '')
 *     age = age attained in year(to num(birth year) or nothing)
 *     k401 = min(c 401k read as a number (0 when it is not one), annual401k limit(age) ÷ 12)
 *     match = (k401 × to num(employer match value)) ÷ 100   if employer match mode = 'pct'
 *     employer match monthly(op)   otherwise
 *     the answer = k401 + to num(c roth) + to num(c invest) + match
 *
 * Called by ... MK-PL-F-067 willItLastInputs · MK-XS-F-030 effectiveAnnualContribution
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-046 how the employer match is expressed — percent or dollars
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-041
 * Changed ..... 2026-06-05 (f742136)
 */
export function monthlyContributionsFromOnboarding(op: Record<string, any> | null): number | null {
  const a = op ?? {};
  // NOT ANSWERED IS NOT ZERO (outside review, 2026-10-07): with no contribution answer at all there is
  // no figure, and the reader says so rather than projecting from $0.
  if (!['c_401k', 'c_roth', 'c_invest', 'employerMatchValue'].some((k) => String(a[k] ?? '').trim() !== '')) return null;
  // WHAT GOES INTO RETIREMENT, AT WHAT THE LAW ALLOWS. Property money (an older setup question —
  // extra mortgage principal, saving toward a property) pays down a loan or buys a house; it does not
  // enter the retirement pot and is left out. A 401(k) figure above the year's elective limit for the
  // person's age is held at the limit ÷ 12: $2,500/month into a 401(k) at 45 projected $30,000/year
  // where 2026 allows $24,500. The Roth answer is NOT held at the IRA limit: the question did not say
  // Roth IRA or Roth 401(k), whose limits differ four-fold, and cutting a Roth 401(k) saver to $7,500
  // would be the wrong figure. The employer's match is outside the elective limit and is added as entered.
  const age = ageAttainedInYear(toNum(a.birthYear) || null);
  const k401 = Math.min(toNum(a.c_401k), annual401kLimit(age) / 12);
  // A MATCH AS A PERCENT IS ON WHAT CAN GO IN (outside review, 2026-10-07): an employer matches money
  // that was actually contributed, so a percent match is taken on the 401(k) figure after the limit —
  // $3,200 held to $2,979 with a 50% match is $1,490, not $1,600. A dollar match is as entered.
  const match = a.employerMatchMode === 'pct' ? (k401 * toNum(a.employerMatchValue)) / 100 : employerMatchMonthly(op);
  return k401 + toNum(a.c_roth) + toNum(a.c_invest) + match;
}

const COLLECTION = 'assets';
export const ASSETS_UPDATED = 'AssetsUpdated';

/** Reads a person's saved accounts from storage and calculates nothing. */
/* ─ MK-NW-F-042 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadAssets
 *
 * Answers ..... Reads a person's saved accounts from storage and calculates nothing.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... MK-NW-F-044 getAssetsState
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-044 getAssetsState
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-042
 * Changed ..... 2026-07-30 (a85874e)
 */
export async function loadAssets(uid: UserId) { return getUserDoc<AssetsDoc>(COLLECTION, uid); }

/** Saves a person's accounts to storage, tells the rest of the app it changed, and calculates nothing. */
/* ─ MK-NW-F-043 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveAssets
 *
 * Answers ..... Saves a person's accounts to storage, tells the rest of the app it changed, and calculates nothing.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-043
 * Changed ..... 2026-07-30 (a85874e)
 */
export async function saveAssets(d: AssetsDoc) { await setUserDoc(COLLECTION, d.user_id, d); emit(ASSETS_UPDATED, { user_id: d.user_id }); }

/** Reads a person's saved accounts and returns their totals, or nothing when none are saved. */
/* ─ MK-NW-F-044 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * getAssetsState
 *
 * Answers ..... Reads a person's saved accounts and returns their totals, or nothing when none are saved.
 *
 * Formula .....
 *     assets state from(uid, await load assets(uid))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-044
 * Changed ..... 2026-07-30 (a85874e)
 */
export async function getAssetsState(uid: UserId) {
  return assetsStateFrom(uid, await loadAssets(uid));
}

/** The saved accounts as a state to show — or nothing, when nothing is saved OR every saved account was deleted (outside review, 2026-10-07: an empty list is not a $0 total with a blended return). */
/* ─ MK-NW-F-111 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * assetsStateFrom
 *
 * Answers ..... The saved accounts as a state to show — or nothing, when nothing is saved OR every saved account was deleted (outside review, 2026-10-07: an empty list is not a $0 total with a blended return).
 *
 * Formula .....
 *     build assets state(uid, accounts ?? [])   if count of d and (accounts ?? [])
 *     nothing   otherwise
 *
 * Called by ... MK-NW-F-044 getAssetsState
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-044 getAssetsState
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-111
 * Changed ..... not in git yet (—)
 */
export function assetsStateFrom(uid: UserId, d: AssetsDoc | null | undefined): AssetsState | null {
  return d && (d.accounts ?? []).length ? buildAssetsState(uid, d.accounts ?? []) : null;
}

/** THE source wording (Build-47 walk row 8, audit Strategy #9): one sentence per source, used by
 *  every screen that names where an account's numbers come from. The on-row chip LOOK is a separate
 *  founder-gated mock (audit item 10) — this is the words, so they can never drift again. */

/** The words saying where an account's numbers come from, which are Linked, Imported or By hand, with a date added only when the numbers are stale. */
/* ─ MK-NW-F-045 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * sourceWording
 *
 * Answers ..... The words saying where an account's numbers come from, which are Linked, Imported or By hand, with a date added only when the numbers are stale.
 *
 * Formula .....
 *     stale = is stale(last synced, now)
 *     ago = age label(last synced, now)
 *     `linked · ${ago ?? 'not updated yet'}`   if stale
 *     'Linked'   otherwise   when source = 'connected'
 *     `imported · ${ago ?? 'not updated yet'}`   if stale
 *     'Imported'   otherwise   when source = 'imported'
 *     the answer = 'by hand · you update it'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-006 price fetched at
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-045
 * Changed ..... 2026-08-07 (0482964)
 */
export function sourceWording(a: AssetAccount, now: number = Date.now()): string {
  // SOURCE ALWAYS, DATE ONLY WHEN STALE — DEC-0301, and his approved design says it on its own face:
  // change row 12 of the Net worth mock (v08, approved 2026-09-14) reads *"The source chip reads
  // Linked; a date appears only when the numbers are stale"*, with his words *"connected only unless
  // stale"*. The code applied half of that ruling — it renamed Connected to Linked — and kept printing
  // the day every time, in raw ISO, so a date on screen meant nothing in particular. A date that is
  // always there cannot be a warning.
  const stale = isStale(a.last_synced, now);
  const ago = ageLabel(a.last_synced, now);
  if (a.source === 'connected') return stale ? `Linked · ${ago ?? 'not updated yet'}` : 'Linked';
  if (a.source === 'imported') return stale ? `Imported · ${ago ?? 'not updated yet'}` : 'Imported';
  return 'By hand · you update it';
}


/** FOUNDER RULE 2026-08-04 — the fifth ingredient check: does this account's shared history actually
 *  cover the window a figure claims? Returns null when it does (nothing to say), or the honest
 *  shortfall when it doesn't. `windowStart` is the figure's own start date ('YYYY-MM-DD').
 *  Hand-entered accounts have no activity feed at all — they report `kind: 'none'`. */
export interface HistoryCoverage {
  kind: 'none' | 'partial';
  from: string | null;            // where the shared history actually begins
  monthsCovered: number | null;   // how much of the claimed window is really covered
  sentence: string;               // the one plain sentence a screen shows
}

/** Says how far back one account's activity records reach, set against the period being asked about, in a sentence a person can read. */
/* ─ MK-NW-F-046 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * historyCoverage
 *
 * Answers ..... Says how far back one account's activity records reach, set against the period being asked about, in a sentence a person can read.
 *
 * Formula .....
 *     who = (institution or label or 'this account').trim()
 *     from = the first 10 of string(history from)   if history from
 *     nothing   otherwise
 *     nothing   when the first 10 of from ≤ window start
 *     whole = (now.get full year() − fy) × 12 + (now.get month() + 1 − fm) − (now.get date() < fd ? 1 : 0)
 *     days in month = the date now.get full year(), now.get month() + (now.get date() < fd ? 0 : 1), 0).get date(
 *     part = ((now.get date() − fd + (now.get date() < fd ? days in month : 0)) % days in month) ÷ days in month
 *     months = max(0, round down((whole + part) × 10 + 1e − 9) ÷ 10)
 *     whole months = max(0, whole)
 *     yrs = round down(whole months ÷ 12), rem = whole months % 12
 *     plural = (n: number, w: string) => `${n} ${w}${n = 1 ? '' : 's'}`
 *
 * Called by ... MK-XS-F-002 dataGaps
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-002 dataGaps
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-057 the date an account history begins
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Never lets whole fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-046
 * Changed ..... 2026-08-07 (0482964)
 */
export function historyCoverage(
  a: AssetAccount,
  windowStart: string,
  now: Date = new Date(),
): HistoryCoverage | null {
  const who = (a.institution || a.label || 'This account').trim();
  if (a.source === 'manual' || !a.source) {
    return { kind: 'none', from: null, monthsCovered: null,
      sentence: `${who} has no activity records — dividends and interest here are only what you enter.` };
  }
  const from = a.history_from ? String(a.history_from).slice(0, 10) : null;
  if (!from) {
    return { kind: 'none', from: null, monthsCovered: null,
      sentence: `${who} hasn't shared any activity records yet — its income lines stay empty rather than showing a false $0.` };
  }
  if (from <= windowStart.slice(0, 10)) return null;          // fully covered — say nothing
  // WHOLE MONTHS PASSED PLUS THE PART MONTH (days ÷ the days in that month), to one decimal. The
  // sentence never rounds up: eighteen months read "2 years" (outside review, 2026-10-07) — more
  // coverage than there was, from the one line meant to say how little there is.
  const [fy, fm, fd] = from.split('-').map(Number);
  const whole = (now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm) - (now.getDate() < fd ? 1 : 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + (now.getDate() < fd ? 0 : 1), 0).getDate();
  const part = ((now.getDate() - fd + (now.getDate() < fd ? daysInMonth : 0)) % daysInMonth) / daysInMonth;
  // ROUNDED DOWN, AND THE SENTENCE FROM WHOLE MONTHS (outside review, 2026-10-07): one day short of a
  // year was 11.97 months, rounded to 12.0 and read '1 year' — the rounding up the line exists to avoid.
  const months = Math.max(0, Math.floor((whole + part) * 10 + 1e-9) / 10);
  const wholeMonths = Math.max(0, whole);
  const yrs = Math.floor(wholeMonths / 12), rem = wholeMonths % 12;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const span = wholeMonths >= 12 ? (rem === 0 && part === 0 ? plural(yrs, 'year') : rem === 0 ? `${plural(yrs, 'year')} and a bit` : `${plural(yrs, 'year')} ${plural(rem, 'month')}`)
    : wholeMonths >= 1 ? plural(wholeMonths, 'month')
    : 'a few days';
  return { kind: 'partial', from, monthsCovered: months,
    sentence: `${who} shared ${span} of history (from ${prettyDay(from)}) — figures before that aren't counted.` };
}
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Writes a date as month, day and year: Aug 4, 2026. */
/* ─ MK-NW-F-068 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * prettyDay
 *
 * Answers ..... Writes a date as month, day and year: Aug 4, 2026.
 *
 * Formula .....
 *     m = ÷ ^(\d{4}) − (\d{2}) − (\d{2}) ÷ .exec(string(iso ?? '').trim())
 *     ''   when m is missing
 *     ''   when mo < 1 (or mo > 12 (or d < 1 (or d > new date(date.UTC(y, mo, 0)).get utcdate() when missing or zero) when missing or zero) when missing or zero)
 *     the answer = `${MONTH_ABBR[mo − 1]} ${d}, ${y}`
 *
 * Called by ... MK-NW-F-046 historyCoverage
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-002 dataGaps · MK-NW-F-046 historyCoverage
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-068
 * Changed ..... not in git yet (—)
 */
export function prettyDay(iso: string): string {
  // read as a calendar date, never through a clock or a time zone; an empty or unreadable date gives
  // nothing (the screen shows a dash), never 'Invalid Date' or a guessed month (outside review batch 06)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? '').trim());
  if (!m) return '';
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return '';
  return `${MONTH_ABBR[mo - 1]} ${d}, ${y}`;
}


// ── THE THREE UBER-GROUPS (founder-approved final mock, mockup-vf/networth-FINAL) ────────────────
// The Net-worth screen groups what you own into three plain ideas — Cash · Investments ·
// Personal property — with the asset CLASSES as rows inside. One map, so the screen, the totals
// and any future surface can never disagree about which class belongs where.
// Investments == the Performance tab's total, by definition (agreement-pinned).
export type UberGroup = 'cash' | 'investments' | 'property';
export const UBER_LABEL: Record<UberGroup, string> = {
  cash: 'Cash', investments: 'Investments', property: 'Personal property',
};
export const UBER_ICON: Record<UberGroup, string> = { cash: '💵', investments: '📈', property: '🏠' };
export const UBER_ORDER: UberGroup[] = ['cash', 'investments', 'property'];
const CLASS_UBER: Record<AssetClass, UberGroup> = {
  cash: 'cash',
  stocks_etf: 'investments', bonds: 'investments', alternatives: 'investments', mixed: 'investments',
  real_estate: 'property', personal_property: 'property',
};

/** Which of the three Net worth groups an asset class belongs to: Cash, Investments or Personal property. */
/* ─ MK-NW-F-047 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * uberGroupOf
 *
 * Answers ..... Which of the three Net worth groups an asset class belongs to: Cash, Investments or Personal property.
 *
 * Formula .....
 *     CLASS_UBER[cls] (or 'investments' when missing)
 *
 * Called by ... MK-NW-F-048 uberGroupRows
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-048 uberGroupRows
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-047
 * Changed ..... 2026-08-09 (7c1b320)
 */
export const uberGroupOf = (cls: AssetClass): UberGroup => CLASS_UBER[cls] ?? 'investments';

/** Group per-class totals into the three uber-groups, keeping class order inside each. */
/* ─ MK-NW-F-048 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * uberGroupRows
 *
 * Answers ..... Group per-class totals into the three uber-groups, keeping class order inside each.
 *
 * Formula .....
 *     classes = class rows where uber group of(key) = group
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-048
 * Changed ..... 2026-08-09 (7c1b320)
 */
export function uberGroupRows(
  classRows: { key: AssetClass; label: string; color: string; total: number }[],
): { group: UberGroup; label: string; icon: string; total: number; classes: typeof classRows }[] {
  return UBER_ORDER.map((group) => {
    const classes = classRows.filter((r) => uberGroupOf(r.key) === group);
    return {
      group, label: UBER_LABEL[group], icon: UBER_ICON[group],
      total: (classes.reduce((t, r) => t + r.total, 0)), classes,
    };
  }).filter((g) => g.classes.length > 0);
}
