// Cash-flow / bill-calendar engine. Turns onboarding answers into a 12-month picture of money IN
import type { OnboardingProfile } from '../onboardingProfile';
// (paychecks, scholarships, loan disbursements, benefits…) vs money OUT (bills by their due months),
// with a running balance so we can flag the months where you'd come up short.
import { toNum, round2 } from '../_shared/num';
import {
  grossSalaryMonthly, rsuAnnual, rentalNetAnnual, equityRowValue, salaryGrossByMonth,
  effectiveRate, totalGrossAnnual, taxableAnnual, retirementIncomeMonthly, currentRetirementIncomeMonthly,
  benefitAnnual, benefitActiveMonths, otherIncomeMonth,
} from '../income';
import { spendBuckets, spendByMonth } from '../budget';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function zero12(): number[] { return new Array(12).fill(0); }

/** Level annual equity spread across the months it vests (0 for most students). */
export function equityByMonth(op: Record<string, any>): number[] {
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


// ───────────────────────── Day-level "big bill" planner ─────────────────────────
// Answers the real question for a dated bill (e.g. tuition due Sep 15): on the day you need the
// money in the bank, how much will you actually have — and how much (and by when) to ask whoever
// covers your shortfall. Works at DAY resolution for dated items; steady income/spend accrues daily.
const DAY_MS = 86400000;
function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / DAY_MS); }
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * DAY_MS); }
function iso(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/** The next time (month, day) occurs on/after `now`, unless an explicit year is given. */
function nextOccurrence(month1to12: number, day: number, now: Date, year?: number): Date {
  const d0 = day > 0 ? day : 1;
  if (year && year > 0) return new Date(year, month1to12 - 1, d0);
  let d = new Date(now.getFullYear(), month1to12 - 1, d0);
  if (d.getTime() < now.getTime()) d = new Date(now.getFullYear() + 1, month1to12 - 1, d0);
  return d;
}

export interface UpcomingBill {
  id: string;
  label: string;
  amount: number;
  dueDate: string;          // ISO — when the bill is due
  needByDate: string;       // dueDate − buffer (money must be in the account)
  askByDate: string;        // needByDate − lead (when to request the shortfall)
  availableByNeed: number;  // projected cash on the need-by date (after earlier commitments)
  shortfall: number;        // how much more you need for this bill
  coverSource: string;      // who/what covers the gap
  daysAway: number;         // days from now until due
}

export function upcomingBills(
  op: OnboardingProfile | null,
  startBalance = 0,
  now: Date = new Date(),
  opts: { bufferDays?: number; askLeadDays?: number; horizonDays?: number } = {},
): UpcomingBill[] {
  const a = op ?? {};
  const buffer = opts.bufferDays ?? 2, lead = opts.askLeadDays ?? 10, horizon = opts.horizonDays ?? 365;
  const rate = effectiveRate(op);

  // steady, recurring monthly net (excludes the dated lumps handled below)
  const monthlySch = (Array.isArray(a.scholarships) ? a.scholarships : [])
    .filter((s: any) => s?.freq === 'monthly').reduce((t: number, s: any) => t + toNum(s.amount), 0);
  const steadyInMonthly =
    grossSalaryMonthly(op) * (1 - rate) + toNum(a.tipsMonthly) * (1 - rate)
    + toNum(a.supportMonthly) + benefitAnnual(op) / 12 + monthlySch
    + currentRetirementIncomeMonthly(op) * (1 - rate) + (rentalNetAnnual(op) / 12) * (1 - rate);
  const b = spendBuckets(op);
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - b.monthly_total);
  const steadyOutMonthly = b.fixed + b.flexible + uncategorized;       // monthly bills only (non-monthly are dated)
  const steadyDailyNet = (steadyInMonthly - steadyOutMonthly) * 12 / 365;

  // dated cash IN (scholarships/grants & loans on their disbursement dates)
  const inflows: { date: Date; amt: number }[] = [];
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    if (sc?.freq === 'monthly') continue;
    const amt = toNum(sc?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(sc?.months) && sc.months.length ? sc.months : [1];
    for (const m of ms) inflows.push({ date: nextOccurrence(m, toNum(sc?.day), now, toNum(sc?.year)), amt: amt / ms.length });
  }
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const amt = toNum(ln?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : [1];
    for (const m of ms) inflows.push({ date: nextOccurrence(m, toNum(ln?.day), now, toNum(ln?.year)), amt });
  }

  // dated bills OUT (non-monthly categories on their due dates)
  const billsOut: { id: string; label: string; amount: number; date: Date; critical: boolean }[] = [];
  const netMonthly = (totalGrossAnnual(op) - taxableAnnual(op) * rate) / 12;
  for (const c of (Array.isArray(a.spendCats) ? a.spendCats : [])) {
    if (c?.bucket !== 'nonmonthly') continue;
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const yearly = c?.unit === 'pct' ? (amt / 100) * netMonthly * 12 : amt;
    const ms = Array.isArray(c?.months) && c.months.length ? c.months : [1];
    for (const m of ms) billsOut.push({ id: `${c.id}-${m}`, label: c.label ?? c.id ?? 'Bill', amount: yearly / ms.length, date: nextOccurrence(m, toNum(c?.dueDay), now), critical: (c.tier ?? 'flex') === 'critical' });
  }

  const balanceOn = (target: Date, excludeId: string): number => {
    let bal = startBalance + steadyDailyNet * Math.max(0, daysBetween(now, target));
    for (const f of inflows) if (f.date.getTime() <= target.getTime()) bal += f.amt;
    for (const o of billsOut) if (o.id !== excludeId && o.date.getTime() <= target.getTime()) bal -= o.amount;
    return bal;
  };

  const coverSource = (a.incomeSources ?? []).includes('support') ? 'your family' : 'your savings or a backup';
  return billsOut
    .filter((bill) => { const d = daysBetween(now, bill.date); return d >= 0 && d <= horizon; })
    .sort((x, y) => x.date.getTime() - y.date.getTime())
    .map((bill) => {
      const needBy = addDays(bill.date, -buffer);
      const avail = balanceOn(needBy, bill.id);
      const shortfall = Math.max(0, round2(bill.amount - avail));
      return {
        id: bill.id, label: bill.label, amount: round2(bill.amount),
        dueDate: iso(bill.date), needByDate: iso(needBy), askByDate: iso(addDays(needBy, -lead)),
        availableByNeed: round2(avail), shortfall, coverSource, daysAway: daysBetween(now, bill.date),
      };
    });
}

export interface MonthFlow { label: string; inflow: number; outflow: number; net: number; balance: number; }
export interface CashflowYear {
  months: MonthFlow[];
  shortMonths: string[];      // months where the running balance dips below 0
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
  beyondWindow: number;       // dated items (scholarships/loans) that fall outside the next 12 months
}

/** Build the 12-month cash-flow picture. `startBalance` = cash on hand today (default 0).
 *  Salary timing comes from the per-month base-salary table (a $0 month = no pay that month). */
export function cashflowYear(op: OnboardingProfile | null, startBalance = 0, now: Date = new Date()): CashflowYear {
  const a = op ?? {};
  const rate = effectiveRate(op);

  // Rolling 12-month window anchored to THIS month, so timing is real: each chosen month maps to
  // its NEXT occurrence (e.g. with "now" = June, "September" = this Sep, "January" = next Jan, which
  // therefore lands AFTER September — never propping up an earlier month's balance).
  const startMonth = now.getMonth();                          // 0–11
  const startYear = now.getFullYear();
  const calMonth = (s: number) => (startMonth + s) % 12;      // calendar month (0–11) at slot s
  const slotOf = (m1to12: number) => ((m1to12 - 1) - startMonth + 12) % 12;   // slot for a calendar month (next occurrence)
  const nowIdx = startYear * 12 + startMonth;
  // slot for an explicit month + year; -1 if outside the next-12-month window. No year → next occurrence.
  const slotForMY = (m1to12: number, year: number) => {
    if (!year) return slotOf(m1to12);
    const idx = year * 12 + (m1to12 - 1) - nowIdx;
    return idx >= 0 && idx < 12 ? idx : -1;
  };
  let beyondWindow = 0;

  // ── money in (net of tax for taxable sources; non-taxable lands in full) ──
  const taxableMo = zero12(), nontaxMo = zero12();
  const salByMonth = salaryGrossByMonth(op), rentalM = rentalNetAnnual(op) / 12;
  const seM = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  const invM = toNum(a.invAnnual) / 12;
  const otherFreq = a.otherFreq ?? 'monthly';
  const otherTaxable = a.otherTaxable !== 'no';
  const otherM = otherFreq === 'monthly' ? toNum(a.otherAmount) : otherFreq === 'annual' ? toNum(a.otherAmount) / 12 : 0;
  const eq = equityByMonth(a);
  const retIncM = currentRetirementIncomeMonthly(op), tipsM = toNum(a.tipsMonthly);
  const benM = toNum(a.benefitMonthly); const benSet = new Set(benefitActiveMonths(op));
  for (let s = 0; s < 12; s++) {
    const cm = calMonth(s);
    const sal = salByMonth[cm];                                           // base salary for that calendar month
    const job = sal + (sal > 0 ? tipsM : 0);                              // wage + tips (tips only in paid months)
    taxableMo[s] += job + seM + rentalM + invM + (otherTaxable ? otherM : 0) + eq[cm] + retIncM;
    nontaxMo[s] += (benSet.has(cm + 1) ? benM : 0) + toNum(a.supportMonthly)
      + (otherTaxable ? 0 : otherM);                                        // benefits in THEIR months; gifts non-taxable
  }
  if (toNum(a.bonusAnnual) > 0) taxableMo[slotOf(Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12)))] += toNum(a.bonusAnnual);   // bonus → its month
  if (toNum(a.signingOnetime) > 0) taxableMo[0] += toNum(a.signingOnetime);            // signing → now
  if (otherFreq === 'onetime' && toNum(a.otherAmount) > 0) {
    const slot = slotOf(otherIncomeMonth(op));                              // one-time other → ITS month
    (otherTaxable ? taxableMo : nontaxMo)[slot] += toNum(a.otherAmount);
  }

  // scholarships/grants land on their disbursement months (+ optional year); yearly total split across them
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    if (sc?.freq === 'monthly') { for (let s = 0; s < 12; s++) nontaxMo[s] += toNum(sc.amount); continue; }
    const amt = toNum(sc?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(sc?.months) && sc.months.length ? sc.months : null;
    const yr = toNum(sc?.year);
    if (ms) for (const m of ms) { const slot = slotForMY(m, yr); if (slot >= 0) nontaxMo[slot] += amt / ms.length; else beyondWindow++; }
    else for (let s = 0; s < 12; s++) nontaxMo[s] += amt / 12;
  }
  // student loans disburse (per-occurrence amount) in each chosen month (+ optional year) — borrowed cash in
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const amt = toNum(ln?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : null;
    const yr = toNum(ln?.year);
    if (ms) for (const m of ms) { const slot = slotForMY(m, yr); if (slot >= 0) nontaxMo[slot] += amt; else beyondWindow++; }
    else nontaxMo[0] += amt;   // unspecified → assume this month
  }

  // ── money out (bills by due month) — single source of truth: budget.spendByMonth (calendar),
  //    remapped onto the rolling timeline. ──
  const out = zero12();
  const spendCal = spendByMonth(op);                       // Jan→Dec: monthly bills + non-monthly in their months + uncategorized
  for (let s = 0; s < 12; s++) out[s] += spendCal[calMonth(s)];

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
  return { months, shortMonths, lowestBalance, totalIn: round2(totalIn), totalOut: round2(totalOut), beyondWindow };
}
