// Decumulation (retirement drawdown) — pure helpers for the "will it last?" view.
// Tax-bucket split of the nest egg, net withdrawal + rate vs the 4% guideline, deterministic
// depletion age, a tax-efficient withdrawal order, and required minimum distributions (RMDs).
import type { AssetAccount } from '../assets';
import { rmdStartAgeFromAge, rmdDivisor as engineRmdDivisor } from '../../../Calculation Module code/engines/rmd';
import { earmarkedAmount } from '../assets';
import { round2 } from '../_shared/num';

// ---- where the money sits, by tax treatment ----
export interface BucketSplit { taxable: number; preTax: number; roth: number; cash: number; total: number; }
/* ─ MK-PL-F-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxBucketSplit
 *
 * Answers ..... How is the retirement money split by the tax that will be owed on it?
 *
 * Formula .....
 *     s = taxable = 0
 *     pre tax = 0
 *     roth = 0
 *     cash = 0
 *     total = 0
 *     v = earmarked amount(a)
 *     the answer = s
 *
 * Called by ... MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-068 selectWillItLast · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-001
 * Changed ..... 2026-06-05 (8ada09f)
 */
export function taxBucketSplit(accounts: AssetAccount[]): BucketSplit {
  const s: BucketSplit = { taxable: 0, preTax: 0, roth: 0, cash: 0, total: 0 };
  for (const a of accounts ?? []) {
    if (a.tax_bucket === 'PROPERTY') continue;
    const v = earmarkedAmount(a);               // retirement-earmarked portion of the account
    if (v <= 0) continue;
    if (a.tax_bucket === 'PRE_TAX') s.preTax += v;
    else if (a.tax_bucket === 'ROTH') s.roth += v;
    else if (a.tax_bucket === 'CASH') s.cash += v;
    else s.taxable += v;                          // TAXABLE
    s.total += v;
  }
  (Object.keys(s) as (keyof BucketSplit)[]).forEach((k) => { s[k] = round2(s[k]); });
  return s;
}

// ---- net withdrawal & rate ----
export type RateBand = 'safe' | 'moderate' | 'high' | 'none';
export interface WithdrawalPlan {
  spendAnnual: number; guaranteedAnnual: number; netWithdrawal: number;
  withdrawalRate: number | null;   // net withdrawal ÷ nest egg (decimal)
  rateBand: RateBand;              // vs the ~4% guideline
}
/* ─ MK-PL-F-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * withdrawalPlan
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     spend annual = round(spend monthly × 12, 2 dp)
 *     guaranteed annual = round(guaranteed monthly × 12, 2 dp)
 *     net withdrawal = max(0, round(spend annual − guaranteed annual, 2 dp))
 *     withdrawal rate = round(net withdrawal ÷ nest egg, 4 dp)   if nest egg > 0
 *     nothing   otherwise
 *     the answer = { spend annual, guaranteed annual, net withdrawal, withdrawal rate, rate band }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-002
 * Changed ..... 2026-06-05 (8ada09f)
 */
export function withdrawalPlan(spendMonthly: number, guaranteedMonthly: number, nestEgg: number): WithdrawalPlan {
  const spendAnnual = round2(spendMonthly * 12);
  const guaranteedAnnual = round2(guaranteedMonthly * 12);
  const netWithdrawal = Math.max(0, round2(spendAnnual - guaranteedAnnual));
  const withdrawalRate = nestEgg > 0 ? Math.round((netWithdrawal / nestEgg) * 1e4) / 1e4 : null;
  const rateBand: RateBand = netWithdrawal === 0 ? 'none'
    : withdrawalRate == null ? 'none'
    : withdrawalRate <= 0.04 ? 'safe'
    : withdrawalRate <= 0.05 ? 'moderate' : 'high';
  return { spendAnnual, guaranteedAnnual, netWithdrawal, withdrawalRate, rateBand };
}

// ---- deterministic depletion ----
/** Age the portfolio runs out (deterministic), or null if it lasts to the horizon.
 *  Net withdrawal grows with inflation; balance grows at the expected return. */
/* ─ MK-PL-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * depletionAge
 *
 * Answers ..... ---- deterministic depletion ---- Age the portfolio runs out (deterministic), or null if it lasts to the horizon.
 *
 * Formula .....
 *     bal = nest egg
 *     net = net withdrawal now
 *     rmd on = (pre tax share ?? 0) > 0
 *     pre tax bal = bal × min(1, max(0, pre tax share!))   if rmd on
 *     0   otherwise
 *     rate = min(0.6, max(0, rmd tax rate (or 0.22 when missing)))
 *     growth = 1 + return rate
 *     a + 1   when bal ≤ 0
 *     the answer = nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-029 inflation rate
 *
 * Decides .....
 *     · If pre tax share is missing it uses 0.
 *     · If required withdrawal tax rate is missing it uses 22%.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-003
 * Changed ..... 2026-07-14 (6952f12)
 */
export function depletionAge(o: { age: number; horizon: number; nestEgg: number; netWithdrawalNow: number; returnRate: number; inflation: number; preTaxShare?: number; rmdTaxRate?: number }): number | null {
  let bal = o.nestEgg;
  let net = o.netWithdrawalNow;
  // PRD F9#12: from 73 the forced pre-tax withdrawal's TAX drags the egg (optional — legacy unchanged)
  const rmdOn = (o.preTaxShare ?? 0) > 0;
  let preTaxBal = rmdOn ? bal * Math.min(1, Math.max(0, o.preTaxShare!)) : 0;
  const rate = Math.min(0.6, Math.max(0, o.rmdTaxRate ?? 0.22));
  for (let a = o.age; a < o.horizon; a++) {
    const growth = 1 + o.returnRate;
    bal = bal * growth - net;
    if (rmdOn) {
      preTaxBal = Math.max(0, Math.min(bal, preTaxBal * growth - net * (bal > 0 ? preTaxBal / Math.max(bal, preTaxBal) : 1)));
      if (a >= rmdStartAgeFor(a) && preTaxBal > 0) {
        const rmd = rmdAtAge(preTaxBal, a);
        preTaxBal -= rmd;
        bal -= rmd * rate;
      }
    }
    if (bal <= 0) return a + 1;          // depleted during this year
    net = net * (1 + o.inflation);
  }
  return null;                            // survives to horizon
}

// ---- tax-efficient withdrawal order ----
export interface OrderStep { bucket: keyof BucketSplit | 'rmd'; label: string; amount: number; why: string; }
/** Tax-efficient withdrawal order. Pass `age` so RMD-age users see the mandatory RMD as step 1
 *  (RMDs legally force pre-tax withdrawals first — a static cash→taxable→pre-tax→roth order is wrong
 *  once you're 73+). Omitting age keeps the classic order for accumulation/pre-RMD users. */
export type DrawBucket = 'cash' | 'taxable' | 'preTax' | 'roth';
export const DEFAULT_DRAW_ORDER: DrawBucket[] = ['cash', 'taxable', 'preTax', 'roth'];

/* ─ MK-PL-F-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * withdrawalOrder
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     steps = seq where split[bucket] > 0for each of : ...each = ...each
 *     amount = split[bucket]
 *     pre = steps.find((s) => bucket = 'preTax')
 *     the answer = steps
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-029 inflation rate
 *
 * Decides .....
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-004
 * Changed ..... 2026-08-02 (a58480f)
 */
export function withdrawalOrder(split: BucketSplit, age = 0, userOrder?: DrawBucket[] | null): OrderStep[] {
  const base: { bucket: keyof BucketSplit; label: string; why: string }[] = [
    { bucket: 'cash', label: 'Cash', why: 'Spend first — it earns the least, so use it before it loses to inflation.' },
    { bucket: 'taxable', label: 'Taxable / brokerage', why: 'Next — lets your tax-advantaged accounts keep compounding (you only owe tax on gains).' },
    { bucket: 'preTax', label: 'Pre-tax (401k / Traditional IRA)', why: 'Then pre-tax — withdrawals are taxed as income, and required withdrawals force this from 73 anyway.' },
    { bucket: 'roth', label: 'Roth', why: 'Last — tax-free growth and no RMDs, so let it run as long as possible.' },
  ];
  // a saved user preference reorders the buckets (the steer sheet writes it; the RMD pin below
  // is law, not preference, and always stays on top)
  const seq = (userOrder && userOrder.length === 4 && DEFAULT_DRAW_ORDER.every((b) => userOrder.includes(b)))
    ? userOrder.map((b) => base.find((x) => x.bucket === b)!)
    : base;
  const steps: OrderStep[] = seq.filter((s) => split[s.bucket] > 0).map((s) => ({ ...s, amount: split[s.bucket] }));
  if (age >= rmdStartAgeFor(age) && split.preTax > 0) {
    const pre = steps.find((s) => s.bucket === 'preTax');
    if (pre) pre.why = 'The rest, beyond your required withdrawal — taxed as income.';
    return [{ bucket: 'rmd', label: 'Required withdrawal (RMD) — first', amount: rmdAtAge(split.preTax, age),
      why: `Mandatory at ${age}: you must take this from pre-tax first, taxed as income whether you need it or not.` }, ...steps];
  }
  return steps;
}

// ---- Required Minimum Distributions ----
// B4 (founder brief 2026-08-20): the rule lives in ONE dated, sourced table — the Calculation
// Module's rmd engine. The start age follows the birth-year rule (73 born 1951–1959, 75 born
// 1960+); Roth 401(k)s are exempt BY CONSTRUCTION here — taxBucketSplit puts every ROTH-bucket
// account outside the pre-tax base this math runs on (pinned by test).
/** The start age for a person known only by AGE (birth year ≈ this year − age). */
/* ─ MK-PL-F-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdStartAgeFor
 *
 * Answers ..... ---- Required Minimum Distributions ---- B4 (founder brief 2026-08-20): the rule lives in ONE dated, sourced table — the Calculation Module's rmd engine.
 *
 * Formula .....
 *     73   if age = nothing
 *     rmd start age from age(age, now year)   otherwise
 *
 * Called by ... MK-PL-F-003 depletionAge · MK-PL-F-004 withdrawalOrder
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-027 nextDecision
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-027 nextDecision · MK-PL-F-008 rmdSchedule
 *               MK-PL-F-004 withdrawalOrder
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-005
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdStartAgeFor(age?: number | null, nowYear = new Date().getFullYear()): number {
  return age == null ? 73 : rmdStartAgeFromAge(age, nowYear);
}
/* ─ MK-PL-F-078 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdDivisorAtAge
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     engine rmd divisor(age, now year − age)
 *
 * Called by ... MK-PL-F-007 rmdAtAge · MK-PL-F-008 rmdSchedule
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-027 nextDecision · MK-PL-F-007 rmdAtAge
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-004 withdrawalOrder
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-078
 * Changed ..... not in git yet (—)
 */
export function rmdDivisorAtAge(age: number, nowYear = new Date().getFullYear()): number {
  return engineRmdDivisor(age, nowYear - age);
}
/** Required minimum distribution from pre-tax balances at a given age (0 before the start age). */
/* ─ MK-PL-F-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdAtAge
 *
 * Answers ..... Required minimum distribution from pre-tax balances at a given age (0 before the start age).
 *
 * Formula .....
 *     required withdrawal = round(pre-tax balance ÷ divisor(age), 2 dp)
 *                         = 0   when the divisor is 0
 *
 * Called by ... MK-PL-F-003 depletionAge · MK-PL-F-004 withdrawalOrder
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-027 nextDecision
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-027 nextDecision · MK-PL-F-008 rmdSchedule
 *               MK-PL-F-004 withdrawalOrder
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-007
 * Changed ..... 2026-07-14 (63edc6b)
 */
export function rmdAtAge(preTaxBalance: number, age: number): number {
  const d = rmdDivisorAtAge(age);
  return d > 0 ? round2(preTaxBalance / d) : 0;
}

// ── FCC: the required-withdrawals screen (detailed design Plan r43-r51) ─────────────────────

export interface RmdYearRow {
  age: number;
  year: number;
  projectedPreTax: number;   // estimate — moves with balances and returns
  divisor: number;
  amount: number;            // the mandated withdrawal that year (estimate for future years)
  isCurrent: boolean;
}

/** Year-by-year mandated-withdrawal schedule (ESTIMATES: future balances move with returns).
 *  ONE growth rule: balance grows at `expReturn`, then the year's RMD leaves the pre-tax bucket.
 *  Starts at the LATER of age 73 / current age; runs `years` rows. The SAME rmdAtAge() every
 *  other surface uses (agreement-pinned). */
/* ─ MK-PL-F-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdSchedule
 *
 * Answers ..... Year-by-year mandated-withdrawal schedule (ESTIMATES: future balances move with returns).
 *
 * Formula .....
 *     rows = []
 *     rows   when pre tax now ≤ 0
 *     start age = max(rmd start age for(age now, now year), age now)
 *     bal = pre tax now
 *     r = max(0, exp return (or 0 when missing or zero))
 *     age = start age + i
 *     amount = rmd at age(bal, age)
 *     the answer = rows
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If exp return is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses a built-in i of 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-008
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdSchedule(preTaxNow: number, ageNow: number, expReturn: number, years = 15, nowYear = new Date().getFullYear()): RmdYearRow[] {
  const rows: RmdYearRow[] = [];
  if (preTaxNow <= 0) return rows;
  const startAge = Math.max(rmdStartAgeFor(ageNow, nowYear), ageNow);
  let bal = preTaxNow;
  // walk row 9: the SAME growth step every projection uses — no schedule-only clamp, no inline math
  const { growOneYear } = require('../retirement');
  const r = Math.max(0, expReturn || 0);
  for (let age = ageNow; age < startAge; age++) bal = growOneYear(bal, r);   // grow to the start year
  for (let i = 0; i < years; i++) {
    const age = startAge + i;
    const amount = rmdAtAge(bal, age);
    rows.push({ age, year: nowYear + (age - ageNow), projectedPreTax: Math.round(bal), divisor: rmdDivisorAtAge(age), amount, isCurrent: age === ageNow });
    bal = Math.max(0, growOneYear(bal - amount, r));
  }
  return rows;
}

/** Withdrawals already taken THIS year from the pre-tax accounts (the one ledger — no side lists).
 *  Counts WITHDRAWAL rows whose account is in the pre-tax bucket, dated this calendar year. */
/* ─ MK-PL-F-009 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdTakenThisYear
 *
 * Answers ..... Withdrawals already taken THIS year from the pre-tax accounts (the one ledger — no side lists).
 *
 * Formula .....
 *     ids = a list with no repeats of for each of pre tax account ids: string
 *
 * Called by ... MK-PL-F-027 nextDecision
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-027 nextDecision
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged spending
 *
 * Decides .....
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-009
 * Changed ..... 2026-07-14 (0cbdfee)
 */
export function rmdTakenThisYear(transactions: { type?: string; account_id?: string; amount?: number; date?: string }[], preTaxAccountIds: string[], nowYear = new Date().getFullYear()): number {
  const ids = new Set(preTaxAccountIds.map(String));
  return round2((transactions ?? [])
    .filter((t) => t.type === 'WITHDRAWAL' && ids.has(String(t.account_id)) && String(t.date ?? '').startsWith(String(nowYear)))
    .reduce((s, t) => s + (t.amount || 0), 0));
}

// ── the draw-order steer sheet's comparator (design r50) ───────────────────────────────────
// Deterministic bucket-by-bucket depletion with the assumptions stated, no Monte-Carlo cosplay:
// each year the spending gap (spend − guaranteed) is drawn from the buckets in the given order;
// pre-tax draws are grossed up by the ordinary rate, taxable draws by the capital-gains rate on
// the gain share; cash and Roth draw tax-free. Balances grow at a REAL return (inflation already
// removed), so dollars stay today-sized. From 73 the law forces the RMD out of pre-tax first —
// spent toward the need, any excess moved (after tax) into the taxable bucket.
export interface DrawOutcome { lastsToAge: number | null; totalTaxes: number; }
/* ─ MK-PL-F-010 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * drawOrderOutcome
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ord = ordinary rate (or 0.22, cg = (cap gains rate ?? 0.15) × (gain share ?? 0.5) when missing)
 *     gross up = cash = 0
 *     taxable = cg
 *     pre tax = ord
 *     roth = 0
 *     bal = cash = split.cash
 *     taxable = split.taxable
 *     pre tax = split.pre tax
 *     roth = split.roth
 *     taxes = 0
 *     need0 = max(0, spend annual − guaranteed annual)
 *     lasts to age = nothing
 *     total taxes = 0   when need0 ≤ 0
 *     need = need0
 *     rmd = rmd at age(bal.pre tax, age)
 *     take = min(rmd, bal.pre tax)
 *     tax = take × ord; taxes += tax
 *     net = take − tax
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If ordinary rate is missing it uses 22%.
 *     · If cap gains rate is missing it uses 15%.
 *     · If gain share is missing it uses 50%.
 *     · Uses a built-in taxes of 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-010
 * Changed ..... 2026-07-14 (0cbdfee)
 */
export function drawOrderOutcome(
  split: BucketSplit,
  order: DrawBucket[],
  o: { age: number; horizon: number; spendAnnual: number; guaranteedAnnual: number; realGrowth: number; ordinaryRate?: number; capGainsRate?: number; gainShare?: number },
): DrawOutcome {
  const ord = o.ordinaryRate ?? 0.22, cg = (o.capGainsRate ?? 0.15) * (o.gainShare ?? 0.5);
  const grossUp: Record<DrawBucket, number> = { cash: 0, taxable: cg, preTax: ord, roth: 0 };
  const bal: Record<DrawBucket, number> = { cash: split.cash, taxable: split.taxable, preTax: split.preTax, roth: split.roth };
  let taxes = 0;
  const need0 = Math.max(0, o.spendAnnual - o.guaranteedAnnual);
  if (need0 <= 0) return { lastsToAge: null, totalTaxes: 0 };
  for (let age = o.age; age <= o.horizon; age++) {
    let need = need0;
    if (age >= rmdStartAgeFor(o.age) && bal.preTax > 0) {
      const rmd = rmdAtAge(bal.preTax, age);
      const take = Math.min(rmd, bal.preTax);
      bal.preTax -= take;
      const tax = take * ord; taxes += tax;
      const net = take - tax;
      const toNeed = Math.min(net, need); need -= toNeed;
      bal.taxable += net - toNeed;                    // excess RMD reinvested after tax
    }
    for (const b of order) {
      if (need <= 0.005) break;
      if (bal[b] <= 0) continue;
      const rate = grossUp[b];
      const grossNeeded = need / (1 - rate);
      const take = Math.min(bal[b], grossNeeded);
      bal[b] -= take;
      const tax = take * rate; taxes += tax;
      need -= take - tax;
    }
    if (need > 0.005) return { lastsToAge: age, totalTaxes: round2(taxes) };
    (Object.keys(bal) as DrawBucket[]).forEach((b) => { bal[b] = bal[b] * (1 + Math.max(-0.05, o.realGrowth)); });
  }
  return { lastsToAge: null, totalTaxes: round2(taxes) };   // survives the whole horizon
}
