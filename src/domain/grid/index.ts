// F2 — THE dated 12-month grid (approved detailed design v1.1). Every by-month surface reads these
// cells: a rolling window anchored to the CURRENT month, each cell a real dated month (year-wrap
// labels like "Jan ’27"), each cell carrying ITEM LISTS so a month-detail's rows visibly sum to its
// bar. Dated items beyond the window land in `later` — visible, never silently dropped.
//
// SAMENESS: this engine derives from the SAME canonical helpers the app already trusts —
// salaryGrossByMonth / equityByMonth / benefitActiveMonths / spendByMonth / effectiveRate — and the
// grid.test.ts agreement suite pins Σcells to cashflowYear's totals, so promoting screens onto the
// grid can never change their numbers.
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum, round2 } from '../_shared/num';
import {
  salaryGrossByMonth, effectiveRate, currentRetirementIncomeMonthly, otherIncomeMonth,
  benefitActiveMonths, rentalNetAnnual,
} from '../income';
import { spendByMonth } from '../budget';
import { equityByMonth } from '../cashflow';
import { requiredPayment, type Debt } from '../debt';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface GridIncomeItem {
  source: string;
  amount: number;          // the NET contribution to the month (taxable items arrive net of tax)
  gross?: number;          // pre-tax amount when it differs
  day?: number;            // day of month when known — never invented
  approx?: boolean;        // weekly/biweekly shown as a monthly equivalent ("about")
}
export interface GridBillItem { label: string; amount: number; day?: number; kind: 'bill' | 'debt'; critical?: boolean }
export interface GridCell {
  calendarMonth: number;   // 1–12
  year: number;            // real year — the whole point (founder review c/F2 #15)
  label: string;           // 'Jul' … 'Jan ’27'
  incomeItems: GridIncomeItem[];
  billItems: GridBillItem[];
  inflow: number;          // Σ incomeItems.amount — rows visibly sum (month-detail pin)
  outflow: number;         // Σ billItems.amount
  net: number;
  runningBalance: number;
}
export interface LaterItem { label: string; amount: number; month: number; year: number }
export interface DatedGrid {
  cells: GridCell[];
  later: LaterItem[];
  shortMonths: string[];
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
}
export interface GridOptions {
  startBalance?: number;
  now?: Date;
  /** Debt payments join the grid as billItems (kind 'debt') on due_day, monthly, STARTING at
   *  first_payment_date (deferred loans show no payment before it — founder review F2 #17). */
  liabilities?: Debt[];
  /** F5 seam: dated guaranteed-income rows (Social Security / pension / annuity in their REAL
   *  months). When provided, the flat retirement-income line is omitted — the dated rows replace
   *  it (never both; no double counting). */
  guaranteedIncome?: { source: string; amount: number; month: number; year?: number; day?: number }[];
}

/** Build the dated 12-month grid. Pure; all placement rules stated here once. */
export function buildDatedGrid(op: OnboardingProfile | null, opts: GridOptions = {}): DatedGrid {
  const a: Record<string, any> = op ?? {};
  const now = opts.now ?? new Date();
  const rate = effectiveRate(op);
  const net = (gross: number) => gross * (1 - rate);

  const startMonth = now.getMonth();                       // 0–11
  const startYear = now.getFullYear();
  const nowIdx = startYear * 12 + startMonth;
  const calMonth = (s: number) => (startMonth + s) % 12;
  const slotOf = (m1to12: number) => ((m1to12 - 1) - startMonth + 12) % 12;          // next occurrence
  const slotForMY = (m1to12: number, year?: number) => {                             // explicit month+year
    if (!year) return slotOf(m1to12);
    const idx = year * 12 + (m1to12 - 1) - nowIdx;
    return idx >= 0 && idx < 12 ? idx : -1;
  };

  const income: GridIncomeItem[][] = Array.from({ length: 12 }, () => []);
  const bills: GridBillItem[][] = Array.from({ length: 12 }, () => []);
  const later: LaterItem[] = [];
  const put = (s: number, item: GridIncomeItem) => { if (item.amount > 0.004) income[s].push(item); };

  // ── income placement (every cadence stated once — the rules the founder approved) ──
  const salByMonth = salaryGrossByMonth(op);
  const tipsM = toNum(a.tipsMonthly);
  for (let s = 0; s < 12; s++) {
    const sal = salByMonth[calMonth(s)];
    if (sal > 0) {
      put(s, { source: 'Salary (take-home share)', amount: net(sal), gross: sal });
      if (tipsM > 0) put(s, { source: 'Tips', amount: net(tipsM), gross: tipsM, approx: true });
    }
  }
  const seM = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  const rentalM = rentalNetAnnual(op) / 12;
  const invM = toNum(a.invAnnual) / 12;
  for (let s = 0; s < 12; s++) {
    if (seM > 0) put(s, { source: 'Self-employment', amount: net(seM), gross: seM, approx: a.seFreq === 'annual' });
    if (rentalM > 0) put(s, { source: 'Rental (after costs)', amount: net(rentalM), gross: rentalM, approx: true });
    if (invM > 0) put(s, { source: 'Investment income', amount: net(invM), gross: invM, approx: true });
  }
  // "other" income — every rhythm honored, incl. QUARTERLY (anchored, not hardcoded) and a REAL
  // year on one-time money (founder review F2 #16: money lands when it actually lands):
  const otherAmt = toNum(a.otherAmount);
  if (otherAmt > 0) {
    const taxable = a.otherTaxable !== 'no';
    const val = (g: number): GridIncomeItem => taxable
      ? { source: a.otherLabel || 'Other income', amount: net(g), gross: g }
      : { source: a.otherLabel || 'Other income', amount: g };
    const freq = a.otherFreq ?? 'monthly';
    if (freq === 'monthly') for (let s = 0; s < 12; s++) put(s, val(otherAmt));
    else if (freq === 'annual') { const s = slotForMY(otherIncomeMonth(op), toNum(a.otherIncomeYear) || undefined); if (s >= 0) put(s, val(otherAmt)); else later.push({ label: a.otherLabel || 'Other income', amount: otherAmt, month: otherIncomeMonth(op), year: toNum(a.otherIncomeYear) }); }
    else if (freq === 'quarterly') { const anchor = slotOf(otherIncomeMonth(op)); for (let q = 0; q < 4; q++) { const s = (anchor + q * 3) % 12; put(s, val(otherAmt)); } }
    else if (freq === 'onetime') { const s = slotForMY(otherIncomeMonth(op), toNum(a.otherIncomeYear) || undefined); if (s >= 0) put(s, val(otherAmt)); else later.push({ label: a.otherLabel || 'One-time income', amount: otherAmt, month: otherIncomeMonth(op), year: toNum(a.otherIncomeYear) }); }
  }
  if (toNum(a.bonusAnnual) > 0) {
    const m = Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12));
    put(slotOf(m), { source: 'Bonus', amount: net(toNum(a.bonusAnnual)), gross: toNum(a.bonusAnnual) });
  }
  if (toNum(a.signingOnetime) > 0) put(0, { source: 'Signing bonus', amount: net(toNum(a.signingOnetime)), gross: toNum(a.signingOnetime) });
  const eq = equityByMonth(a);
  for (let s = 0; s < 12; s++) {
    const v = eq[calMonth(s)];
    if (v > 0) put(s, { source: 'Equity vesting', amount: net(v), gross: v });
  }
  const benM = toNum(a.benefitMonthly);
  if (benM > 0) { const set = new Set(benefitActiveMonths(op)); for (let s = 0; s < 12; s++) if (set.has(calMonth(s) + 1)) put(s, { source: 'Benefits', amount: benM }); }
  if (toNum(a.supportMonthly) > 0) for (let s = 0; s < 12; s++) put(s, { source: 'Family support', amount: toNum(a.supportMonthly) });
  // scholarships / student-loan disbursements keep their dated placement (month + optional year)
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    const amt = toNum(sc?.amount); if (amt <= 0) continue;
    if (sc?.freq === 'monthly') { for (let s = 0; s < 12; s++) put(s, { source: sc.label || 'Scholarship', amount: amt }); continue; }
    const ms = Array.isArray(sc?.months) && sc.months.length ? sc.months : null;
    if (ms) for (const m of ms) { const s = slotForMY(m, toNum(sc?.year) || undefined); if (s >= 0) put(s, { source: sc.label || 'Scholarship', amount: amt / ms.length }); else later.push({ label: sc.label || 'Scholarship', amount: amt / ms.length, month: m, year: toNum(sc?.year) }); }
    else for (let s = 0; s < 12; s++) put(s, { source: sc.label || 'Scholarship', amount: amt / 12 });
  }
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const amt = toNum(ln?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : null;
    if (ms) for (const m of ms) { const s = slotForMY(m, toNum(ln?.year) || undefined); if (s >= 0) put(s, { source: ln.label || 'Loan disbursement', amount: amt }); else later.push({ label: ln.label || 'Loan disbursement', amount: amt, month: m, year: toNum(ln?.year) }); }
    else put(0, { source: ln.label || 'Loan disbursement', amount: amt });
  }
  // retirement income: dated rows from F5 when provided; else the flat received-now line (approx)
  if (opts.guaranteedIncome?.length) {
    for (const g of opts.guaranteedIncome) {
      const s = slotForMY(g.month, g.year);
      if (s >= 0) put(s, { source: g.source, amount: g.amount, day: g.day });
      else later.push({ label: g.source, amount: g.amount, month: g.month, year: g.year ?? 0 });
    }
  } else {
    const retM = currentRetirementIncomeMonthly(op);
    if (retM > 0) for (let s = 0; s < 12; s++) put(s, { source: 'Retirement income', amount: net(retM), gross: retM, approx: true });
  }

  // ── bills: named non-monthly items + a reconciling remainder, so Σ billItems(bill) per cell
  //    EQUALS the canonical spendByMonth to the cent (one spend engine, agreement-tested) ──
  const spendCal = spendByMonth(op);
  const netMonthlyIncome = (() => { let t = 0; for (const cell of income) for (const i of cell) t += i.amount; return t / 12; })();
  const named: number[] = new Array(12).fill(0);
  for (const c of (Array.isArray(a.spendCats) ? a.spendCats : [])) {
    if (c?.bucket !== 'nonmonthly') continue;
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const yearly = c?.unit === 'pct' ? (amt / 100) * netMonthlyIncome * 12 : amt;
    const ms = Array.isArray(c?.months) && c.months.length ? c.months : [1];
    const yr = toNum(c?.year) || undefined;                       // one-off bills may carry a YEAR (v1.1)
    for (const m of ms) {
      const s = slotForMY(m, yr);
      const item: GridBillItem = { label: c.label ?? c.id ?? 'Bill', amount: yearly / ms.length, day: toNum(c?.dueDay) || undefined, kind: 'bill', critical: (c.tier ?? 'flex') === 'critical' };
      if (s >= 0) { bills[s].push(item); named[s] += item.amount; }
      else later.push({ label: item.label, amount: item.amount, month: m, year: yr ?? 0 });
    }
  }
  for (let s = 0; s < 12; s++) {
    const rest = spendCal[calMonth(s)] - named[s];
    if (rest > 0.004) bills[s].push({ label: 'Everyday spending', amount: rest, kind: 'bill' });
  }
  // debt payments: monthly on due_day, starting at first_payment_date, ending at payoff_date
  for (const d of (opts.liabilities ?? [])) {
    const pay = requiredPayment(d); if (pay <= 0) continue;
    const startIdx = d.first_payment_date ? (() => { const m = d.first_payment_date.match(/^(\d{4})-(\d{2})/); return m ? (+m[1] * 12 + (+m[2] - 1)) - nowIdx : 0; })() : 0;
    const endIdx = d.payoff_date ? (() => { const m = d.payoff_date.match(/^(\d{4})-(\d{2})/); return m ? (+m[1] * 12 + (+m[2] - 1)) - nowIdx : 11; })() : 11;
    for (let s = Math.max(0, startIdx); s <= Math.min(11, endIdx); s++) {
      bills[s].push({ label: d.label, amount: pay, day: d.due_day, kind: 'debt' });
    }
    if (startIdx > 11 && pay > 0) {
      const m = d.first_payment_date!.match(/^(\d{4})-(\d{2})/)!;
      later.push({ label: `${d.label} (payments start)`, amount: pay, month: +m[2], year: +m[1] });
    }
  }

  // ── roll up: cells derive FROM the items, so rows always sum to the bar ──
  let bal = opts.startBalance ?? 0, totalIn = 0, totalOut = 0;
  const cells: GridCell[] = Array.from({ length: 12 }, (_, s) => {
    const cm = calMonth(s);
    const yr = startYear + Math.floor((startMonth + s) / 12);
    const label = MONTHS[cm] + (yr > startYear ? ` ’${String(yr).slice(2)}` : '');
    const inflow = income[s].reduce((t, i) => t + i.amount, 0);
    const outflow = bills[s].reduce((t, b) => t + b.amount, 0);
    bal += inflow - outflow; totalIn += inflow; totalOut += outflow;
    return {
      calendarMonth: cm + 1, year: yr, label,
      incomeItems: income[s].map((i) => ({ ...i, amount: round2(i.amount), gross: i.gross == null ? undefined : round2(i.gross) })),
      billItems: bills[s].map((b) => ({ ...b, amount: round2(b.amount) })),
      inflow: round2(inflow), outflow: round2(outflow), net: round2(inflow - outflow), runningBalance: round2(bal),
    };
  });
  const shortMonths = cells.filter((c) => c.runningBalance < -0.005).map((c) => c.label);
  return {
    cells, later, shortMonths,
    lowestBalance: round2(Math.min(...cells.map((c) => c.runningBalance))),
    totalIn: round2(totalIn), totalOut: round2(totalOut),
  };
}
