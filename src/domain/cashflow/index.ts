// Cash-flow / bill-calendar engine. Turns onboarding answers into a 12-month picture of money IN
// (paychecks, scholarships, loan disbursements, benefits…) vs money OUT (bills by their due months),
// with a running balance so we can flag the months where you'd come up short.
import { toNum, round2 } from '../_shared/num';
import {
  grossSalaryMonthly, rsuAnnual, rentalNetAnnual, equityRowValue, jobActiveMonth,
  effectiveRate, totalGrossAnnual, taxableAnnual, retirementIncomeMonthly,
} from '../income';
import { spendBuckets } from '../budget';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function zero12(): number[] { return new Array(12).fill(0); }

/** Level annual equity spread across the months it vests (0 for most students). */
function equityByMonth(op: Record<string, any>): number[] {
  const rows = Array.isArray(op.rsuGrants) ? op.rsuGrants : [];
  const type = op.equityType ?? 'rsu';
  const weights = zero12(); let total = 0;
  for (const r of rows) {
    const v = equityRowValue(r, type, op.optStrike, op.optMarket);
    if (v <= 0) continue;
    const m = String(r?.date ?? '').match(/\d{4}-(\d{1,2})/);
    const idx = m ? Math.min(11, Math.max(0, +m[1] - 1)) : 11;
    weights[idx] += v; total += v;
  }
  const annual = rsuAnnual(op), out = zero12();
  if (total > 0) for (let i = 0; i < 12; i++) out[i] = annual * (weights[i] / total);
  return out;
}

/** A yearly amount placed into chosen months (split evenly), mapped onto the rolling timeline via
 *  `slotOf`; with no months given it spreads across all 12 slots. */
function placeYearly(out: number[], yearly: number, months: number[] | undefined, slotOf: (m: number) => number) {
  const ms = Array.isArray(months) && months.length ? months : null;
  if (ms) for (const m of ms) out[slotOf(m)] += yearly / ms.length;
  else for (let i = 0; i < 12; i++) out[i] += yearly / 12;
}

export interface MonthFlow { label: string; inflow: number; outflow: number; net: number; balance: number; }
export interface CashflowYear {
  months: MonthFlow[];
  shortMonths: string[];      // months where the running balance dips below 0
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
}

/** Build the 12-month cash-flow picture. `startBalance` = cash on hand today (default 0).
 *  `lean` models a variable earner's slow stretch — earned income (wage + tips + self-employment)
 *  drops to their "slow month" figure. */
export function cashflowYear(op: Record<string, any> | null, startBalance = 0, now: Date = new Date(), lean = false): CashflowYear {
  const a = op ?? {};
  const rate = effectiveRate(op);
  const netMonthly = (totalGrossAnnual(op) - taxableAnnual(op) * rate) / 12;   // for % expense conversion

  // Rolling 12-month window anchored to THIS month, so timing is real: each chosen month maps to
  // its NEXT occurrence (e.g. with "now" = June, "September" = this Sep, "January" = next Jan, which
  // therefore lands AFTER September — never propping up an earlier month's balance).
  const startMonth = now.getMonth();                          // 0–11
  const startYear = now.getFullYear();
  const calMonth = (s: number) => (startMonth + s) % 12;      // calendar month (0–11) at slot s
  const slotOf = (m1to12: number) => ((m1to12 - 1) - startMonth + 12) % 12;   // slot for a calendar month

  // ── money in (net of tax for taxable sources; non-taxable lands in full) ──
  const taxableMo = zero12(), nontaxMo = zero12();
  const salaryM = grossSalaryMonthly(op), rentalM = rentalNetAnnual(op) / 12;
  const seM = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  const invM = toNum(a.invAnnual) / 12;
  const otherFreq = a.otherFreq ?? 'monthly';
  const otherM = otherFreq === 'monthly' ? toNum(a.otherAmount) : otherFreq === 'annual' ? toNum(a.otherAmount) / 12 : 0;
  const eq = equityByMonth(a);
  const retIncM = retirementIncomeMonthly(op), tipsM = toNum(a.tipsMonthly);
  const lowMonthly = toNum(a.lowMonthly);   // a variable earner's slow-month total earnings (gross)
  for (let s = 0; s < 12; s++) {
    const earnedNormal = (jobActiveMonth(op, startMonth + s, now) ? salaryM : 0) + seM + tipsM;   // wage + self-employment + tips
    const earned = lean && lowMonthly > 0 ? lowMonthly : earnedNormal;                            // slow-month scenario
    taxableMo[s] += earned + rentalM + invM + otherM + eq[calMonth(s)] + retIncM;
    nontaxMo[s] += toNum(a.benefitMonthly) + toNum(a.supportMonthly);
  }
  if (toNum(a.bonusAnnual) > 0) taxableMo[slotOf(Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12)))] += toNum(a.bonusAnnual);   // bonus → its month
  if (toNum(a.signingOnetime) > 0) taxableMo[0] += toNum(a.signingOnetime);            // signing / one-time → now
  if (otherFreq === 'onetime') taxableMo[0] += toNum(a.otherAmount);

  // scholarships/grants land on their disbursement months (yearly total split across them)
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    if (sc?.freq === 'monthly') { for (let s = 0; s < 12; s++) nontaxMo[s] += toNum(sc.amount); }
    else placeYearly(nontaxMo, toNum(sc?.amount), sc?.months, slotOf);
  }
  // student loans disburse (per-occurrence amount) in each chosen month — borrowed cash in
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : null;
    if (ms) for (const m of ms) nontaxMo[slotOf(m)] += toNum(ln.amount);
    else nontaxMo[0] += toNum(ln?.amount);   // unspecified → assume this month
  }

  // ── money out (bills by due month) ──
  const out = zero12();
  for (const c of (Array.isArray(a.spendCats) ? a.spendCats : [])) {
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const pct = c?.unit === 'pct';
    if (c?.bucket === 'nonmonthly') placeYearly(out, pct ? (amt / 100) * netMonthly * 12 : amt, c?.months, slotOf);
    else { const m = pct ? (amt / 100) * netMonthly : amt; for (let s = 0; s < 12; s++) out[s] += m; }
  }
  // any spending estimated but not itemized — spread evenly so we don't understate bills
  const itemizedMo = spendBuckets(op).monthly_total;
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - itemizedMo);
  if (uncategorized > 0) for (let s = 0; s < 12; s++) out[s] += uncategorized;

  // ── roll into a running balance over the real timeline ──
  let bal = startBalance, totalIn = 0, totalOut = 0;
  const months: MonthFlow[] = Array.from({ length: 12 }, (_, s) => {
    const cm = calMonth(s);
    const yr = startYear + Math.floor((startMonth + s) / 12);
    const label = MONTHS[cm] + (yr > startYear ? ` ’${String(yr).slice(2)}` : '');
    const inflow = taxableMo[s] * (1 - rate) + nontaxMo[s];
    const outflow = out[s];
    bal += inflow - outflow;
    totalIn += inflow; totalOut += outflow;
    return { label, inflow: round2(inflow), outflow: round2(outflow), net: round2(inflow - outflow), balance: round2(bal) };
  });
  const shortMonths = months.filter((m) => m.balance < -0.005).map((m) => m.label);
  const lowestBalance = round2(Math.min(...months.map((m) => m.balance)));
  return { months, shortMonths, lowestBalance, totalIn: round2(totalIn), totalOut: round2(totalOut) };
}
