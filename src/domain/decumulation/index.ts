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
export function depletionAge(o: { age: number; horizon: number; nestEgg: number; netWithdrawalNow: number; returnRate: number; inflation: number }): number | null {
  let bal = o.nestEgg;
  let net = o.netWithdrawalNow;
  for (let a = o.age; a < o.horizon; a++) {
    bal = bal * (1 + o.returnRate) - net;
    if (bal <= 0) return a + 1;          // depleted during this year
    net = net * (1 + o.inflation);
  }
  return null;                            // survives to horizon
}

// ---- tax-efficient withdrawal order ----
export interface OrderStep { bucket: keyof BucketSplit; label: string; amount: number; why: string; }
export function withdrawalOrder(split: BucketSplit): OrderStep[] {
  const steps: { bucket: keyof BucketSplit; label: string; why: string }[] = [
    { bucket: 'cash', label: 'Cash', why: 'Spend first — it earns the least, so use it before it loses to inflation.' },
    { bucket: 'taxable', label: 'Taxable / brokerage', why: 'Next — lets your tax-advantaged accounts keep compounding (you only owe tax on gains).' },
    { bucket: 'preTax', label: 'Pre-tax (401k / Traditional IRA)', why: 'Then pre-tax — withdrawals are taxed as income, and RMDs force this from 73 anyway.' },
    { bucket: 'roth', label: 'Roth', why: 'Last — tax-free growth and no RMDs, so let it run as long as possible.' },
  ];
  return steps.filter((s) => split[s.bucket] > 0).map((s) => ({ ...s, amount: split[s.bucket] }));
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
