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

/** A yearly amount placed into chosen months (split evenly); falls back to spread across all 12. */
function placeYearly(out: number[], yearly: number, months?: number[]) {
  const ms = Array.isArray(months) && months.length ? months : null;
  if (ms) for (const m of ms) out[m - 1] += yearly / ms.length;
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

/** Build the 12-month cash-flow picture. `startBalance` = cash on hand today (default 0). */
export function cashflowYear(op: Record<string, any> | null, startBalance = 0, now: Date = new Date()): CashflowYear {
  const a = op ?? {};
  const rate = effectiveRate(op);
  const netMonthly = (totalGrossAnnual(op) - taxableAnnual(op) * rate) / 12;   // for % expense conversion

  // ── money in (net of tax for taxable sources; non-taxable lands in full) ──
  const taxableMo = zero12(), nontaxMo = zero12();
  const salaryM = grossSalaryMonthly(op), rentalM = rentalNetAnnual(op) / 12;
  const seM = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  const invM = toNum(a.invAnnual) / 12;
  const otherFreq = a.otherFreq ?? 'monthly';
  const otherM = otherFreq === 'monthly' ? toNum(a.otherAmount) : otherFreq === 'annual' ? toNum(a.otherAmount) / 12 : 0;
  const eq = equityByMonth(a);
  const retIncM = retirementIncomeMonthly(op), tipsM = toNum(a.tipsMonthly);
  for (let i = 0; i < 12; i++) {
    taxableMo[i] += (jobActiveMonth(op, i, now) ? salaryM : 0) + rentalM + seM + invM + otherM + eq[i] + retIncM + tipsM;
    nontaxMo[i] += toNum(a.benefitMonthly) + toNum(a.supportMonthly);
  }
  if (toNum(a.bonusAnnual) > 0) taxableMo[Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1))] += toNum(a.bonusAnnual);   // bonus → its month (default Dec)
  if (toNum(a.signingOnetime) > 0) taxableMo[0] += toNum(a.signingOnetime);            // signing → January
  if (otherFreq === 'onetime') taxableMo[0] += toNum(a.otherAmount);

  // scholarships/grants land on their disbursement months (yearly total split across them)
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    if (sc?.freq === 'monthly') { for (let i = 0; i < 12; i++) nontaxMo[i] += toNum(sc.amount); }
    else placeYearly(nontaxMo, toNum(sc?.amount), sc?.months);
  }
  // student loans disburse (per-occurrence amount) in each chosen month — borrowed cash in
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : null;
    if (ms) for (const m of ms) nontaxMo[m - 1] += toNum(ln.amount);
    else nontaxMo[0] += toNum(ln?.amount);   // unspecified → assume first month
  }

  // ── money out (bills by due month) ──
  const out = zero12();
  for (const c of (Array.isArray(a.spendCats) ? a.spendCats : [])) {
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const pct = c?.unit === 'pct';
    if (c?.bucket === 'nonmonthly') placeYearly(out, pct ? (amt / 100) * netMonthly * 12 : amt, c?.months);
    else { const m = pct ? (amt / 100) * netMonthly : amt; for (let i = 0; i < 12; i++) out[i] += m; }
  }
  // any spending estimated but not itemized — spread evenly so we don't understate bills
  const itemizedMo = spendBuckets(op).monthly_total;
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - itemizedMo);
  if (uncategorized > 0) for (let i = 0; i < 12; i++) out[i] += uncategorized;

  // ── roll into a running balance ──
  let bal = startBalance, totalIn = 0, totalOut = 0;
  const months: MonthFlow[] = MONTHS.map((label, i) => {
    const inflow = taxableMo[i] * (1 - rate) + nontaxMo[i];
    const outflow = out[i];
    bal += inflow - outflow;
    totalIn += inflow; totalOut += outflow;
    return { label, inflow: round2(inflow), outflow: round2(outflow), net: round2(inflow - outflow), balance: round2(bal) };
  });
  const shortMonths = months.filter((m) => m.balance < -0.005).map((m) => m.label);
  const lowestBalance = round2(Math.min(...months.map((m) => m.balance)));
  return { months, shortMonths, lowestBalance, totalIn: round2(totalIn), totalOut: round2(totalOut) };
}
