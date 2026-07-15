// Decumulation (retirement drawdown) — pure helpers for the "will it last?" view.
// Tax-bucket split of the nest egg, net withdrawal + rate vs the 4% guideline, deterministic
// depletion age, a tax-efficient withdrawal order, and required minimum distributions (RMDs).
import type { AssetAccount } from '../assets';
import { earmarkedAmount } from '../assets';
import { round2 } from '../_shared/num';

// ---- where the money sits, by tax treatment ----
export interface BucketSplit { taxable: number; preTax: number; roth: number; cash: number; total: number; }
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
      if (a >= RMD_START_AGE && preTaxBal > 0) {
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

export function withdrawalOrder(split: BucketSplit, age = 0, userOrder?: DrawBucket[] | null): OrderStep[] {
  const base: { bucket: keyof BucketSplit; label: string; why: string }[] = [
    { bucket: 'cash', label: 'Cash', why: 'Spend first — it earns the least, so use it before it loses to inflation.' },
    { bucket: 'taxable', label: 'Taxable / brokerage', why: 'Next — lets your tax-advantaged accounts keep compounding (you only owe tax on gains).' },
    { bucket: 'preTax', label: 'Pre-tax (401k / Traditional IRA)', why: 'Then pre-tax — withdrawals are taxed as income, and RMDs force this from 73 anyway.' },
    { bucket: 'roth', label: 'Roth', why: 'Last — tax-free growth and no RMDs, so let it run as long as possible.' },
  ];
  // a saved user preference reorders the buckets (the steer sheet writes it; the RMD pin below
  // is law, not preference, and always stays on top)
  const seq = (userOrder && userOrder.length === 4 && DEFAULT_DRAW_ORDER.every((b) => userOrder.includes(b)))
    ? userOrder.map((b) => base.find((x) => x.bucket === b)!)
    : base;
  const steps: OrderStep[] = seq.filter((s) => split[s.bucket] > 0).map((s) => ({ ...s, amount: split[s.bucket] }));
  if (age >= RMD_START_AGE && split.preTax > 0) {
    const pre = steps.find((s) => s.bucket === 'preTax');
    if (pre) pre.why = 'The rest, beyond your required withdrawal — taxed as income.';
    return [{ bucket: 'rmd', label: 'Required withdrawal (RMD) — first', amount: rmdAtAge(split.preTax, age),
      why: `Mandatory at ${age}: you must take this from pre-tax first, taxed as income whether you need it or not.` }, ...steps];
  }
  return steps;
}

// ---- Required Minimum Distributions (SECURE 2.0: begin at 73) ----
export const RMD_START_AGE = 73;
// IRS Uniform Lifetime Table divisors (post-2022). Interpolated between listed ages.
const ULT: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 92: 10.8, 95: 8.9, 100: 6.4,
};
export function rmdDivisor(age: number): number {
  if (age < RMD_START_AGE) return 0;
  if (ULT[age]) return ULT[age];
  const ages = Object.keys(ULT).map(Number).sort((a, b) => a - b);
  if (age >= ages[ages.length - 1]) return ULT[ages[ages.length - 1]];
  let lo = ages[0], hi = ages[ages.length - 1];
  for (const k of ages) { if (k <= age) lo = k; if (k >= age) { hi = k; break; } }
  const t = (age - lo) / (hi - lo || 1);
  return Math.round((ULT[lo] + t * (ULT[hi] - ULT[lo])) * 10) / 10;
}
/** Required minimum distribution from pre-tax balances at a given age (0 before 73). */
export function rmdAtAge(preTaxBalance: number, age: number): number {
  const d = rmdDivisor(age);
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
export function rmdSchedule(preTaxNow: number, ageNow: number, expReturn: number, years = 15, nowYear = new Date().getFullYear()): RmdYearRow[] {
  const rows: RmdYearRow[] = [];
  if (preTaxNow <= 0) return rows;
  const startAge = Math.max(RMD_START_AGE, ageNow);
  let bal = preTaxNow;
  const r = Math.max(0, Math.min(0.12, expReturn || 0));
  for (let age = ageNow; age < startAge; age++) bal *= 1 + r;          // grow to the start year
  for (let i = 0; i < years; i++) {
    const age = startAge + i;
    const amount = rmdAtAge(bal, age);
    rows.push({ age, year: nowYear + (age - ageNow), projectedPreTax: Math.round(bal), divisor: rmdDivisor(age), amount, isCurrent: age === ageNow });
    bal = Math.max(0, (bal - amount) * (1 + r));
  }
  return rows;
}

/** Withdrawals already taken THIS year from the pre-tax accounts (the one ledger — no side lists).
 *  Counts WITHDRAWAL rows whose account is in the pre-tax bucket, dated this calendar year. */
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
    if (age >= RMD_START_AGE && bal.preTax > 0) {
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
