// Asset Ledger module (spec service 2). Owns `assets/{uid}`.
// Tracks balances + tax bucket + target return; provides total value & allocation.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import { employerMatchMonthly } from '../income/onboarding';

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
  stocks_etf: 'Stocks / ETFs',
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
}

/** Manual-value freshness (FCC): how old a hand-entered value is, and whether it needs a nudge.
 *  Applies to accounts WITHOUT live pricing (no derive_balance positions feed). 6+ months = stale.
 *  Returns null when the account is live-priced or carries no as-of date (nothing to judge). */
export function valueFreshness(a: AssetAccount, now: Date = new Date()): { asOf: string; monthsOld: number; stale: boolean } | null {
  if (a.derive_balance) return null;                       // live-priced from positions
  if (!a.value_as_of) return null;
  const m = a.value_as_of.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const monthsOld = Math.max(0, (now.getFullYear() - +m[1]) * 12 + (now.getMonth() + 1 - +m[2]));
  return { asOf: a.value_as_of, monthsOld, stale: monthsOld >= 6 };
}

/** Value-weighted ACTUAL trailing-12mo return across holdings that have one reported.
 *  Returns null when none are reported (so the UI can prompt instead of showing a fake 0%). */
export function portfolioActualReturn(accounts: AssetAccount[]): number | null {
  const items = (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY' && a.actual_ttm != null && earmarkedAmount(a) > 0);
  const total = items.reduce((t, a) => t + earmarkedAmount(a), 0);
  if (total <= 0) return null;
  const weighted = items.reduce((t, a) => t + (a.actual_ttm as number) * earmarkedAmount(a), 0);
  return Math.round((weighted / total) * 1e4) / 1e4;
}

/** Can this account hold individual ticker securities? (Excludes cash, property, and 529 —
 *  a 529 holds the plan's age-based portfolios, not individual stocks.) */
export function accountAllowsTicker(a: AssetAccount): boolean {
  if (a.tax_bucket === 'PROPERTY' || a.tax_bucket === 'CASH') return false;
  if (a.kind === 'college_529') return false;
  if (a.kind === 'checking' || a.kind === 'savings') return false;
  // A dedicated bond or alternative (crypto/options/commodities/…) account holds THOSE instruments, not
  // equity tickers — so it must not appear as a stock-trading target on the Stocks/ETFs screen.
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
  { id: 'money_market', label: 'Money market', icon: '🏧', bucket: 'CASH', section: 'Cash', ret: 0.045 },
  { id: 'cd', label: 'CD', icon: '📑', bucket: 'CASH', section: 'Cash', ret: 0.042 },
  { id: 'cash_mgmt', label: 'Cash management', icon: '💳', bucket: 'CASH', section: 'Cash', ret: 0.035 },
  // Investments (taxable) — common first, then alternatives, then specialty
  { id: 'brokerage', label: 'Brokerage', icon: '📊', bucket: 'TAXABLE', section: 'Investments', ret: 0.08 },
  { id: 'stocks_etf', label: 'Stocks / ETFs', icon: '📈', bucket: 'TAXABLE', section: 'Investments', ret: 0.104 },
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
export const isCashKind = (kind?: string) => assetKind(kind)?.bucket === 'CASH';
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
  stocks_etf: 'stocks_etf',
  fixed_income: 'bonds',
  private_equity: 'alternatives', hedge_funds: 'alternatives', commodities: 'alternatives',
  crypto: 'alternatives', annuities: 'alternatives', other_asset: 'alternatives', options: 'alternatives',
  home: 'real_estate', vehicle: 'personal_property',
};

// FOUNDER RULE 2026-08-04 (supersedes the money-market=cash rule and the 12-month CD split):
// CASH means cash only — a sweep/settlement balance. Instruments that pay dividends or interest
// live in the MEASURED buckets, or the change/return math silently loses their income:
// money-market funds → Stocks / ETFs (funds paying dividends) · CDs / T-bills → Bonds & CDs.
const SWEEP_RE = /\b(sweep|settlement)\b/i;
const MONEY_MARKET_RE = /\b(money[\s-]?market|mmkt|mmf)\b/i;
const CD_TBILL_RE = /\b(cd|certificate of deposit|t-?bills?|treasury bills?)\b/i;
export function incomeBearingClassOf(label?: string): AssetClass | null {
  const t = (label ?? '').trim();
  if (SWEEP_RE.test(t)) return 'cash';                 // uninvested brokerage cash IS cash
  if (MONEY_MARKET_RE.test(t)) return 'stocks_etf';
  if (CD_TBILL_RE.test(t)) return 'bonds';
  return null;
}

/** FOUNDER RULE 2026-08-04 (supersedes build-34 #8's 12-month split): ANY maturity-dated instrument
 *  is a BOND — it pays interest, so it must sit in the measured bucket regardless of how soon it
 *  matures. Stored once as explicit `asset_class`; no maturity → cash (a plain balance). */
export function maturityClass(maturityDate?: string | null): 'cash' | 'bonds' {
  return maturityDate && String(maturityDate).trim() ? 'bonds' : 'cash';
}

/** The "where is it held?" wrapper (taxonomy axis 2) → its account kind + tax bucket. Default = taxable.
 *  The wrapper sets the TAX treatment; the separately-chosen assetClass says WHAT it holds (axis 1). So a
 *  stock in a 401(k) and a stock in a brokerage are the same class, different wrapper. */
export type AddWrapper = 'taxable' | '401k' | 'trad_ira' | 'roth' | 'hsa';
export function wrapperAccount(w?: AddWrapper | null): { kind: string; tax_bucket: TaxBucket } {
  switch (w) {
    case '401k':     return { kind: '401k',     tax_bucket: 'PRE_TAX' };
    case 'trad_ira': return { kind: 'trad_ira', tax_bucket: 'PRE_TAX' };
    case 'roth':     return { kind: 'roth_ira', tax_bucket: 'ROTH' };
    case 'hsa':      return { kind: 'hsa',      tax_bucket: 'PRE_TAX' };
    default:         return { kind: 'brokerage', tax_bucket: 'TAXABLE' };   // taxable / unspecified
  }
}

/** WHAT the account is (asset class). Explicit `asset_class` wins; then the income-bearing label
 *  rule (money-market ⇒ Stocks/ETFs, CD/T-bill ⇒ bonds, sweep ⇒ cash); a maturity date ⇒ a bond;
 *  else derive from `kind`, falling back to the tax bucket. */
export function assetClassOf(a: AssetAccount): AssetClass {
  if (a.asset_class) return a.asset_class;
  const byLabel = incomeBearingClassOf(a.label);
  if (byLabel) return byLabel;                         // founder rule 2026-08-04: cash = cash only
  if (a.maturity_date) return 'bonds';                 // an individual bond (Treasury / muni / corporate)
  const byKind = a.kind ? KIND_TO_CLASS[a.kind] : undefined;
  if (byKind) return byKind;
  if (a.positions && a.positions.length) return 'stocks_etf';   // imported ticker holdings ⇒ market securities
  if (a.tax_bucket === 'CASH') return 'cash';
  if (a.tax_bucket === 'PROPERTY') return 'real_estate';
  // A wrapper whose contents we don't know (401k/IRA/brokerage, no positions, no explicit class):
  // don't pretend it's stocks — mark it unspecified so the allocation is honest (#10, user can classify).
  return 'mixed';
}

/** HOW the account is taxed (wrapper). Explicit `tax_treatment` wins; else map the legacy tax_bucket
 *  (CASH/TAXABLE/PROPERTY → taxable, PRE_TAX → tax_deferred, ROTH → tax_free). */
export function taxTreatmentOf(a: AssetAccount): TaxTreatment {
  if (a.tax_treatment) return a.tax_treatment;
  if (a.tax_bucket === 'PRE_TAX') return 'tax_deferred';
  if (a.tax_bucket === 'ROTH') return 'tax_free';
  return 'taxable';
}

/** Real-estate use (primary/rental/secondary/land); only meaningful when assetClassOf === 'real_estate'.
 *  Defaults to 'primary' (the conservative nest-egg exclusion); explicit `re_use` overrides. */
export function realEstateUseOf(a: AssetAccount): RealEstateUse {
  return a.re_use ?? 'primary';
}

/** True when the asset is a real/physical asset (real estate or personal property) — excluded from
 *  investable assets and the nest egg (Term #4/#7). */
export function isRealAsset(a: AssetAccount): boolean {
  const c = assetClassOf(a);
  return c === 'real_estate' || c === 'personal_property';
}

// ── Canonical asset totals (Term #2/#3/#4) ────────────────────────────────────
// THE single source for each total — screens read these, never re-sum inline. All derive from
// assetClassOf, so they stay consistent across every surface (Net Worth, Home, Insights, donut).
function sumWhere(accounts: AssetAccount[], pred: (a: AssetAccount) => boolean): number {
  return round2((accounts ?? []).filter(pred).reduce((t, a) => t + (a.balance || 0), 0));
}
export function totalAssets(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).reduce((t, a) => t + (a.balance || 0), 0));
}
/** Cash & cash equivalents (Term #3) — THE cash number, and the same one the Net Worth CASH group
 *  shows. L-7 fix 2026-08-10: this used to count whole cash accounts only, so a connected brokerage's
 *  sweep balance was cash in the donut and the CASH group but NOT in the emergency cushion — the same
 *  screen printed "CASH $8,838" above "$8,000 cash ÷ …". Both now read the class breakdown. */
export function cashTotal(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).reduce((t, a) => {
    const b = accountClassBreakdown(a);
    return t + (b ? b.cash : assetClassOf(a) === 'cash' ? (a.balance || 0) : 0);
  }, 0));
}
export function equitiesTotal(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => assetClassOf(a) === 'stocks_etf');
}
export function fixedIncomeTotal(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => assetClassOf(a) === 'bonds');
}
export function alternativesTotal(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => assetClassOf(a) === 'alternatives');
}
export function realEstateTotal(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => assetClassOf(a) === 'real_estate');
}
/** Investments / holdings (allocation view, Term #4) = equities + fixed income + alternatives,
 *  ACROSS all wrappers (so a 401(k)'s stocks count). Excludes cash + real assets. */
export function investmentsTotal(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => { const c = assetClassOf(a); return c === 'stocks_etf' || c === 'bonds' || c === 'alternatives' || c === 'mixed'; });
}
/** Investable assets (Term #4) = all financial assets (cash + investments + retirement balances),
 *  EXCLUDING real estate + personal property. */
export function investableAssets(accounts: AssetAccount[]): number {
  return sumWhere(accounts, (a) => !isRealAsset(a));
}
/** Asset value grouped by class — for the Net Worth donut (#19). Sums to totalAssets(). */
/** THE wrapper word for a naming rule — the kind of ACCOUNT it is, not what it holds. A kind like
 *  'stocks_etf' or 'crypto' describes the holdings; the account they sit in is a Brokerage, and that
 *  is the word a person recognises on a statement (founder rule 2026-08-11:
 *  "Institution + Brokerage/checking/savings/…" and "Institution + 401k/RothIRA/HSA/…"). */
const KIND_TO_WRAPPER: Record<string, string> = {
  checking: 'Checking', savings: 'Savings', hysa: 'High-yield savings',
  money_market: 'Money market', cd: 'CD', cash_mgmt: 'Cash management',
  // everything held inside a taxable investment account wears the account's own word
  brokerage: 'Brokerage', stocks_etf: 'Brokerage', fixed_income: 'Brokerage', crypto: 'Brokerage',
  private_equity: 'Brokerage', hedge_funds: 'Brokerage', commodities: 'Brokerage',
  options: 'Brokerage', annuities: 'Annuity', other_asset: 'Brokerage',
  // tax-advantaged wrappers — these ALWAYS show, because the wrapper is the tax treatment
  '401k': '401(k)', trad_ira: 'Traditional IRA', roth_ira: 'Roth IRA', hsa: 'HSA', college_529: '529',
  home: 'Home', vehicle: 'Vehicle',
};
export const wrapperWord = (kind?: string): string => (kind ? KIND_TO_WRAPPER[kind] ?? '' : '');

/** The last four digits of an account, or null when we genuinely don't have them. Reads the stored
 *  mask ('••4821') or an account number, and only ever returns FOUR DIGITS — E*TRADE relays a
 *  scrambled identifier through SnapTrade whose tail is gibberish, and showing that as "your last
 *  four" would be worse than showing nothing (live-verified 2026-07-19). */
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
  const wrapper = wrapperWord((a as any).kind);
  const taxAdvantaged = taxTreatmentOf(a as AssetAccount) !== 'taxable';
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

/** Display names for a whole LIST of accounts. Masks exist only when they are real digits (build-43
 *  finding: E*TRADE relays a scrambled identifier, not the account number) — so identical twins get
 *  a stable " · 1 / · 2" ordinal instead (ordered by asset_id, so the numbering never shuffles). */
export function accountDisplayNames(accounts: (Pick<AssetAccount, 'asset_id' | 'label' | 'institution' | 'mask'> & { positions?: unknown[] })[]): Map<string, string> {
  const base = new Map(accounts.map((a) => [a.asset_id, accountDisplayName(a)]));
  const counts = new Map<string, number>();
  for (const n of base.values()) counts.set(n, (counts.get(n) ?? 0) + 1);
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const a of [...accounts].sort((x, y) => String(x.asset_id).localeCompare(String(y.asset_id)))) {
    const n = base.get(a.asset_id)!;
    if ((counts.get(n) ?? 0) > 1) {
      const i = (seen.get(n) ?? 0) + 1;
      seen.set(n, i);
      out.set(a.asset_id, `${n} · ${i}`);
    } else out.set(a.asset_id, n);
  }
  return out;
}

/** APPROVED v6 (2026-07-19): a CONNECTED account splits across the asset classes it actually holds
 *  — CDs under bonds, money market + sleeve under cash, options under alternatives, stocks under
 *  stocks — with the slices summing EXACTLY to the broker's authoritative balance. A tiny unpriced
 *  remainder (accrued interest, rounding) folds into the account's largest slice; a material one is
 *  honestly 'mixed'. Manual/imported accounts return null — they stay whole (founder-approved rule). */
export function accountClassBreakdown(a: AssetAccount): Record<AssetClass, number> | null {
  if (a.source !== 'connected') return null;
  const out: Record<AssetClass, number> = { cash: 0, bonds: 0, stocks_etf: 0, alternatives: 0, real_estate: 0, personal_property: 0, mixed: 0 };
  out.cash += (a as any).cash_balance ?? 0;
  for (const p of (a.positions ?? []) as any[]) {
    const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
    const v = p.last_price != null ? sh * p.last_price : 0;
    const cls: AssetClass = p.asset_class === 'bond' ? 'bonds' : p.asset_class === 'other' ? 'alternatives' : p.asset_class === 'cash' ? 'cash' : 'stocks_etf';
    out[cls] += v;
  }
  for (const o of ((a as any).option_holdings ?? []) as any[]) out.alternatives += o.value || 0;
  (Object.keys(out) as AssetClass[]).forEach((k) => { out[k] = round2(out[k]); });
  const sum = round2((Object.values(out) as number[]).reduce((t, v) => t + v, 0));
  const r = round2((a.balance || 0) - sum);
  if (r !== 0) {
    if (Math.abs(r) <= Math.max(1, 0.01 * Math.abs(a.balance || 0))) {
      const largest = (Object.keys(out) as AssetClass[]).sort((x, y) => out[y] - out[x])[0];
      out[largest] = round2(out[largest] + r);
    } else {
      // 2026-08-10, same class of defect as the founder's CD-under-Cash finding: a CONNECTED account
      // that sends no position detail (a CD ladder, a Treasuries account, a savings account) was
      // dumped whole into Unclassified even when we know exactly what it is — its own explicit class,
      // its CD/T-bill label or its kind. Only a wrapper whose contents are genuinely unknown
      // (assetClassOf === 'mixed': a bare 401(k)/IRA/brokerage) may land in Unclassified.
      const own = assetClassOf(a);
      const bucket: AssetClass = own === 'mixed' ? 'mixed' : own;
      out[bucket] = round2(out[bucket] + r);
    }
  }
  return out;
}

const CD_RE = /\b(cd|certificate of deposit)\b/i;
const TREASURY_RE = /\b(treasur\w*|t-?bills?|t-?notes?|govt?|government)\b/i;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Plain words for an account's slice inside a class row. Founder finding 2026-08-11: this repeated
 *  the class name the row already carried ("CDs & Treasuries in this account" under Bonds & CDs).
 *  It COUNTS what is actually in there instead — "3 CDs & 1 Treasury in this account" — so the line
 *  earns its space. Where we cannot tell two things apart (a plain ticker gives no way to know a
 *  stock from an ETF), we say the honest broader word rather than guess a split. */
export function classPortionLabel(a: AssetAccount, cls: AssetClass): string {
  const pos = ((a.positions ?? []) as any[]);
  const inClass = pos.filter((p) => {
    const c = p.asset_class === 'bond' ? 'bonds' : p.asset_class === 'other' ? 'alternatives' : p.asset_class === 'cash' ? 'cash' : 'stocks_etf';
    return c === cls;
  });
  const nameOf = (p: any) => `${p.ticker ?? ''} ${p.name ?? p.label ?? ''}`;
  const opts = (((a as any).option_holdings ?? []) as any[]).length;

  switch (cls) {
    case 'cash': {
      // a cash sleeve is one line — say so plainly (founder: "typically one account has one cash line")
      const mmf = inClass.filter((p) => /money[\s-]?market|\bmmkt\b|\bmmf\b/i.test(nameOf(p))).length;
      return mmf > 0 ? `${plural(mmf, 'money-market fund')} + cash in this account` : 'cash in this account';
    }
    case 'bonds': {
      const cds = inClass.filter((p) => CD_RE.test(nameOf(p))).length;
      const treas = inClass.filter((p) => !CD_RE.test(nameOf(p)) && TREASURY_RE.test(nameOf(p))).length;
      const rest = inClass.length - cds - treas;
      const parts = [
        cds ? plural(cds, 'CD') : '',
        treas ? plural(treas, 'Treasury') : '',
        rest ? plural(rest, 'bond') : '',
      ].filter(Boolean);
      return parts.length ? `${parts.join(' & ')} in this account` : 'bonds & CDs in this account';
    }
    case 'stocks_etf': {
      // a ticker alone cannot tell a share from a fund — one honest word covers both
      return inClass.length ? `${plural(inClass.length, 'holding')} in this account` : 'stocks & funds in this account';
    }
    case 'alternatives': {
      const parts = [opts ? plural(opts, 'option') : '', inClass.length ? plural(inClass.length, 'holding') : ''].filter(Boolean);
      return parts.length ? `${parts.join(' & ')} in this account` : 'alternatives in this account';
    }
    default: return 'unpriced portion of this account';
  }
}

export function assetAllocation(accounts: AssetAccount[]): Record<AssetClass, number> {
  const out: Record<AssetClass, number> = { cash: 0, bonds: 0, stocks_etf: 0, alternatives: 0, real_estate: 0, personal_property: 0, mixed: 0 };
  for (const a of accounts ?? []) {
    const b = accountClassBreakdown(a);
    if (b) (Object.keys(out) as AssetClass[]).forEach((k) => { out[k] += b[k]; });
    else out[assetClassOf(a)] += (a.balance || 0);
  }
  (Object.keys(out) as AssetClass[]).forEach((k) => { out[k] = round2(out[k]); });
  return out;
}

// B-70: the duplicate `investableValue` (excluded only the PROPERTY tax-bucket) was removed — every
// screen now uses the canonical `investableAssets` above (excludes real_estate + personal_property by
// asset CLASS, the taxonomy definition).

/** Default % of an account that's earmarked for retirement (rest funds other goals). */
export function earmarkDefault(a: AssetAccount): number {
  // Term #7: the nest egg is the INVESTED retirement portfolio the 4% rule draws on. Default-exclude (0%):
  if (isRealAsset(a)) return 0;                         // real estate + personal property (a home funds nothing; a rental adds INCOME, not a draw-down balance)
  if (a.kind === 'college_529') return 0;               // earmarked for college
  if (assetClassOf(a) === 'cash') return 0;             // cash = emergency fund / near-term liquidity, NOT the invested portfolio (was 50%)
  return 100;                                           // retirement + investments default fully in (override per account)
}
/** The retirement-earmarked $ for one account (uses the saved % or the smart default). */
export function earmarkedAmount(a: AssetAccount): number {
  const pct = a.retirement_pct == null ? earmarkDefault(a) : a.retirement_pct;
  return round2((a.balance || 0) * Math.max(0, Math.min(100, pct)) / 100);
}
/** Total nest egg = sum of each account's retirement-earmarked portion. This — not net worth — funds retirement. */
export function retirementEarmarkedValue(accounts: AssetAccount[]): number {
  return round2((accounts ?? []).reduce((t, a) => t + earmarkedAmount(a), 0));
}

/** Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default. */
export function benchmarkReturn(kind: string | undefined, overrides?: Record<string, number>): number {
  if (kind && overrides && overrides[kind] != null) return overrides[kind];
  return assetKind(kind)?.ret ?? 0.06;
}

/** Where each benchmark return comes from + the window it's measured over. NOMINAL (the retirement
 *  engine applies inflation separately). `estimate: true` = no clean 30-yr index series exists, so the
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
export function blendedVolatility(accounts: AssetAccount[], overrides?: Record<string, number>): number {
  const items = (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY');
  const total = items.reduce((t, a) => t + earmarkedAmount(a), 0);
  if (total <= 0) return 0.12;
  const weighted = items.reduce((t, a) => {
    const v = (a.kind && overrides?.[a.kind] != null) ? overrides[a.kind] : (a.kind ? KIND_VOLATILITY[a.kind] : undefined);
    return t + (v ?? 0.12) * earmarkedAmount(a);
  }, 0);
  return Math.round((weighted / total) * 1e4) / 1e4;
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
export function benchmarkInfo(kind: string | undefined, overrides?: Record<string, number>): { ret: number; source: string; period: string; edited: boolean; estimate: boolean } {
  const meta = BENCHMARK_META[kind ?? ''] ?? { source: 'Generic blended estimate', period: '—', estimate: true };
  const edited = !!(kind && overrides && overrides[kind] != null);
  return { ret: benchmarkReturn(kind, overrides), source: edited ? 'Your custom estimate' : meta.source, period: edited ? '—' : meta.period, edited, estimate: !!meta.estimate };
}
/** Blended expected return across the EARMARKED nest egg, weighted by each holding's share.
 *  Different asset types earn different returns — equity vs bonds vs PE vs hedge funds — so the
 *  nest egg's growth rate is the value-weighted average of their benchmarks. */
export function blendedReturn(accounts: AssetAccount[], overrides?: Record<string, number>): number {
  const items = (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY');
  const total = items.reduce((t, a) => t + earmarkedAmount(a), 0);
  if (total <= 0) return 0.06;
  const weighted = items.reduce((t, a) => t + benchmarkReturn(a.kind, overrides) * earmarkedAmount(a), 0);
  return Math.round((weighted / total) * 1e4) / 1e4;
}
/** Distinct investment kinds present in the earmarked nest egg (for the benchmark editor). */
export function earmarkedKinds(accounts: AssetAccount[]): string[] {
  const seen = new Set<string>();
  (accounts ?? []).filter((a) => a.tax_bucket !== 'PROPERTY' && earmarkedAmount(a) > 0).forEach((a) => seen.add(a.kind || 'other_asset'));
  return Array.from(seen);
}
export interface AssetsDoc { user_id: UserId; accounts: AssetAccount[]; last_updated?: any; }

export interface AssetsState {
  user_id: UserId;
  total_asset_value: number;
  average_target_return: number;
  accounts: (AssetAccount & { portfolio_percentage: number })[];
}

const DEFAULT_RETURN = 0.07;

export function buildAssetsState(uid: UserId, accounts: AssetAccount[]): AssetsState {
  const total = accounts.reduce((t, a) => t + a.balance, 0);
  const withPct = accounts.map((a) => ({
    ...a, portfolio_percentage: total > 0 ? round2((a.balance / total) * 100) : 0,
  }));
  const avg = total > 0
    ? accounts.reduce((t, a) => t + a.target_return * a.balance, 0) / total
    : DEFAULT_RETURN;
  return { user_id: uid, total_asset_value: round2(total), average_target_return: Math.round(avg * 1e4) / 1e4, accounts: withPct };
}

/** Build asset accounts from onboarding answers (accumulation: retirement savings + holdings). */
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
export function monthlyContributionsFromOnboarding(op: Record<string, any> | null): number {
  const a = op ?? {};
  return ['c_401k', 'c_roth', 'c_invest', 'c_property'].reduce((t, k) => t + toNum(a[k]), 0) + employerMatchMonthly(op);
}

const COLLECTION = 'assets';
export const ASSETS_UPDATED = 'AssetsUpdated';
export async function loadAssets(uid: UserId) { return getUserDoc<AssetsDoc>(COLLECTION, uid); }
export async function saveAssets(d: AssetsDoc) { await setUserDoc(COLLECTION, d.user_id, d); emit(ASSETS_UPDATED, { user_id: d.user_id }); }
export async function getAssetsState(uid: UserId) {
  const d = await loadAssets(uid); return d ? buildAssetsState(uid, d.accounts ?? []) : null;
}

/** THE source wording (Build-47 walk row 8, audit Strategy #9): one sentence per source, used by
 *  every screen that names where an account's numbers come from. The on-row chip LOOK is a separate
 *  founder-gated mock (audit item 10) — this is the words, so they can never drift again. */
export function sourceWording(a: AssetAccount): string {
  const day = a.last_synced ? String(a.last_synced).slice(0, 10) : '';
  if (a.source === 'connected') return `Connected · ${day || 'linked'}`;
  if (a.source === 'imported') return `Imported · ${day || '—'}`;
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
  const [fy, fm, fd] = from.split('-').map(Number);
  const months = Math.max(0, Math.round(((now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm) + (now.getDate() - fd) / 30) * 10) / 10);
  const span = months >= 12 ? `${Math.round(months / 12)} year${months >= 18 ? 's' : ''}`
    : months >= 1 ? `${Math.round(months)} month${Math.round(months) === 1 ? '' : 's'}`
    : 'a few days';
  return { kind: 'partial', from, monthsCovered: months,
    sentence: `${who} shared ${span} of history (from ${prettyDay(from)}) — figures before that aren't counted.` };
}
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function prettyDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTH_ABBR[(m || 1) - 1]} ${d}, ${y}`;
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
export const uberGroupOf = (cls: AssetClass): UberGroup => CLASS_UBER[cls] ?? 'investments';

/** Group per-class totals into the three uber-groups, keeping class order inside each. */
export function uberGroupRows(
  classRows: { key: AssetClass; label: string; color: string; total: number }[],
): { group: UberGroup; label: string; icon: string; total: number; classes: typeof classRows }[] {
  return UBER_ORDER.map((group) => {
    const classes = classRows.filter((r) => uberGroupOf(r.key) === group);
    return {
      group, label: UBER_LABEL[group], icon: UBER_ICON[group],
      total: round2(classes.reduce((t, r) => t + r.total, 0)), classes,
    };
  }).filter((g) => g.classes.length > 0);
}
