// F2 — THE dated 12-month grid (approved detailed design v1.1). Every by-month surface reads these
// cells: a rolling window anchored to the CURRENT month, each cell a real dated month (year-wrap
// labels like "Jan ’27"), each cell carrying ITEM LISTS so a month-detail's rows visibly sum to its
// bar. Dated items beyond the window land in `later` — visible, never silently dropped.
//
// SAMENESS: this function derives from the SAME canonical helpers the app already trusts —
// salaryGrossByMonth / equityByMonth / benefitActiveMonths / spendByMonth / effectiveRate — and the
// grid.test.ts agreement suite pins its bills to spendByMonth to the cent. It is the ONE twelve-month table: the second one,
// cashflowYear (MK-CF-F-020), was retired on 2026-10-25.
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum } from '../_shared/num';
import {
  salaryGrossByMonth, effectiveRate, monthlyTaxRates, currentRetirementIncomeMonthly, otherIncomeMonth,
  benefitActiveMonths, rentalNetAnnual,
} from '../income';
import { wagesLandingByMonth } from '../income/onboarding';   // the wage after tax and the 401(k)s (2026-10-24)
// money that lands once, whether vests are cash, unemployment pay, and the taxed part of retirement income (FIX-INCOME-B, 2026-10-25)
import { landsOnce, vestsAreCash, unemploymentMonthly, retirementIncomeTaxedMonthly } from '../income/onboarding';
import { rateInForce } from '../income/tax-rate';
import { spendByMonth } from '../budget';
import { equityByMonth, equityVests } from '../cashflow';
import { requiredPayment, paymentShape, paymentInMonth, type Debt } from '../debt';
import { daysInMonth } from '../_shared/dates';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface GridIncomeItem {
  source: string;
  amount: number;          // the NET contribution to the month (taxable items arrive net of tax)
  gross?: number;          // pre-tax amount when it differs
  day?: number;            // day of month when known — never invented
  approx?: boolean;        // weekly/biweekly shown as a monthly equivalent ("about")
}
export interface GridBillItem {
  label: string; amount: number; day?: number; kind: 'bill' | 'debt'; critical?: boolean;
  /** the month's everyday expenses or a monthly debt payment — money with no day of its own, counted when the month ends. What is
   *  there by a day inside the month (balanceByDay, the Bill calendar's COMING UP line, 2026-10-24) places every other item on its day */
  regular?: boolean;
}
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
  /** money the table cannot put in any month, with the reason it says (2026-10-25, FIX-BILLS): a vest whose year is one of these
   *  twelve months' years but has no month — "vest month not entered" — and a vest with no date at all — "vest date not
   *  entered". Neither is counted in a month: a month nobody gave would be read as one they did (tenet 3). */
  notInAMonth?: { label: string; amount: number; year: number | null; reason: 'vest month not entered' | 'vest date not entered' }[];
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
  /** F11 seam: one-time planned items an ADOPTED plan creates (e.g. the Roth conversion's tax bill
   *  next April). Placed like named bills; months outside the window land in `later`. */
  oneOffs?: { label: string; amount: number; month: number; year?: number; critical?: boolean }[];
}

/** Build the dated 12-month grid. Pure; all placement rules stated here once. */
/* ─ MK-XS-F-004 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildDatedGrid
 *
 * Answers ..... Build the dated 12-month grid.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     now = opts.now (or new date() when missing)
 *     rates = monthly tax rates(op, opts.now ?? new date())
 *     net at = (s: number, gross: number) => gross × (1 − rates[cal month(s)])
 *     start month = now.get month()
 *     start year = now.get full year()
 *     now idx = start year × 12 + start month
 *     cal month = (s: number) => (start month + s) % 12
 *     slot of = (m1to12: number) => ((m1to12 − 1) − start month + 12) % 12
 *     slot of(m1to12)   when year is missing
 *     idx = year × 12 + (m1to12 − 1) − now idx
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-107 buildPaycheckYear · MK-CF-F-212 receivedInMonth
 *               MK-CF-F-237 LATER · MK-CF-F-242 workedLineAmount
 *               MK-CF-O-008 whatsComing
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-237 LATER
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-CF-F-212 receivedInMonth
 *               MK-CF-O-008 whatsComing · MK-CF-F-242 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-026 big costs (amount and year)
 *               MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-052 the day of the month a debt payment is due
 *
 * Decides .....
 *     · If year is missing it uses 0.
 *     · If a year is missing it uses 0.
 *     · If start balance is missing it uses 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-004
 * Changed ..... 2026-07-14 (cf50737)
 */
export function buildDatedGrid(op: OnboardingProfile | null, opts: GridOptions = {}): DatedGrid {
  const a: Record<string, any> = op ?? {};
  const now = opts.now ?? new Date();
  const rates = monthlyTaxRates(op, opts.now ?? new Date());   // the ONE shared per-month vector — the rate in force, every month
  // slot → its calendar month's rate
  const netAt = (s: number, gross: number) => gross * (1 - rates[calMonth(s)]);

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
  const laterIn: LaterItem[] = [];   // money coming IN beyond the window (a passed one has landed — see the return)
  const put = (s: number, item: GridIncomeItem) => { if (item.amount > 0.004) income[s].push(item); };

  // ── income placement (every cadence stated once — the rules the founder approved) ──
  // THE WAGE THAT LANDS IS THE TAKE-HOME YOUR BASE PAY PRINTS (2026-10-24, the Cash flow journey suite, E2E-71): after its
  // tax AND the 401(k)s, each earner at their own typed take-home where they gave one (wagesLandingByMonth, the producer the
  // income grid and the Income summary agree with). It was the wage less the tax only: $9,000 with $1,000 into a 401(k) read
  // $7,976 on This month and Home beside $6,976 on Your base pay; a take-home typed as $6,200 read $7,200.
  const salByMonth = salaryGrossByMonth(op);
  const wagesLand = wagesLandingByMonth(op, now);
  const theirs = rateInForce(op).mine;   // a rate the person gave is a rate on their pay — not on rent or dividends (frame 16)
  const tipsM = toNum(a.tipsMonthly);
  for (let s = 0; s < 12; s++) {
    const sal = salByMonth[calMonth(s)];
    if (sal > 0) {
      put(s, { source: 'Salary (take-home share)', amount: wagesLand[calMonth(s)], gross: sal });
      if (tipsM > 0) put(s, { source: 'Tips', amount: netAt(s, tipsM), gross: tipsM, approx: true });
    }
  }
  const seM = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  const rentalM = rentalNetAnnual(op) / 12;
  const invM = toNum(a.invAnnual) / 12;
  // INTEREST AND DIVIDENDS REINVESTED NEVER REACH THE BANK (finding B34): they land only when paid to the bank; under a
  // calculated rate their tax still comes out of what does land, as the income grid and the Income summary take it.
  const invLands = a.invPaidToBank === 'yes';
  for (let s = 0; s < 12; s++) {
    if (seM > 0) put(s, { source: 'Self-employment', amount: netAt(s, seM), gross: seM, approx: a.seFreq === 'annual' });
    // A RENTAL LOSS IS MONEY OUT OF THE MONTH (2026-10-25, FIX-INCOME-B; FOUND F4 by the outside measurement): the running costs
    // are paid from the bank, so a rental losing $500/month takes $500 off the month — This month read $7,200 in and a planned
    // surplus of +$1,150 where it is $6,700 and +$650 (the month grid and the Income summary count it). It was left out (> 0).
    if (rentalM !== 0) income[s].push({ source: 'Rental (after costs)', amount: theirs ? rentalM : netAt(s, rentalM), gross: rentalM, approx: true });
    if (invM > 0 && invLands) put(s, { source: 'Investment income', amount: theirs ? invM : netAt(s, invM), gross: invM, approx: true });
  }
  // "other" income — every rhythm honored, incl. QUARTERLY (anchored, not hardcoded) and a REAL
  // year on one-time money (founder review F2 #16: money lands when it actually lands):
  const otherAmt = toNum(a.otherAmount);
  if (otherAmt > 0) {
    const taxable = a.otherTaxable !== 'no';
    const val = (s: number, g: number): GridIncomeItem => taxable
      ? { source: a.otherLabel || 'Other income', amount: netAt(s, g), gross: g }
      : { source: a.otherLabel || 'Other income', amount: g };
    const freq = a.otherFreq ?? 'monthly';
    if (freq === 'monthly') for (let s = 0; s < 12; s++) put(s, val(s, otherAmt));
    else if (freq === 'annual') { const s = slotForMY(otherIncomeMonth(op), toNum(a.otherIncomeYear) || undefined); if (s >= 0) put(s, val(s, otherAmt)); else laterIn.push({ label: a.otherLabel || 'Other income', amount: otherAmt, month: otherIncomeMonth(op), year: toNum(a.otherIncomeYear) }); }
    else if (freq === 'quarterly') { const anchor = slotOf(otherIncomeMonth(op)); for (let q = 0; q < 4; q++) { const s = (anchor + q * 3) % 12; put(s, val(s, otherAmt)); } }
    // ONE TIME, WITH NO YEAR, IS IN NO MONTH (2026-10-25, FIX-INCOME-B; landsOnce; DEC-0447, DEC-7940): it was put in the next
    // time its month comes, so it came back every year — "year not entered" is said where the source is listed
    else if (freq === 'onetime') { const o = landsOnce(op).find((x) => x.kind === 'other'); if (o && o.counts && o.year != null && o.month != null) { const s = slotForMY(o.month, o.year); if (s >= 0) put(s, val(s, otherAmt)); else laterIn.push({ label: a.otherLabel || 'One-time income', amount: otherAmt, month: o.month, year: o.year }); } }
  }
  if (toNum(a.bonusAnnual) > 0) {
    const m = Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12));
    put(slotOf(m), { source: 'Bonus', amount: netAt(slotOf(m), toNum(a.bonusAnnual)), gross: toNum(a.bonusAnnual) });
  }
  // A SIGNING BONUS LANDS ONCE, IN THE MONTH ITS DATE NAMES (2026-10-25, FIX-INCOME-B; landsOnce; DEC-0447): it landed in this
  // month every time the table was drawn; with no date it is in no month
  for (const o of landsOnce(op)) {
    if (o.kind !== 'signing' || o.year == null || o.month == null) continue;
    const s = slotForMY(o.month, o.year);
    if (s >= 0) put(s, { source: 'Signing bonus', amount: netAt(s, o.amount), gross: o.amount });
    else if ((o.year * 12 + (o.month - 1)) - nowIdx > 11) laterIn.push({ label: 'Signing bonus', amount: o.amount, month: o.month, year: o.year });
  }
  // EACH VEST IN ITS OWN YEAR AND MONTH (2026-10-25, FIX-BILLS; his DEC-0012, DEC-0003): read for each year these twelve months
  // span. A vest after the window is money coming in LATER, never dropped; one with no month, or no date, is in no month and is
  // named with its reason (notInAMonth). It was the yearly run-rate laid on the vest months with the year ignored.
  const yearOfSlot = (s: number) => startYear + Math.floor((startMonth + s) / 12);
  const eqOf = new Map<number, number[]>();
  for (let s = 0; s < 12; s++) {
    const yr = yearOfSlot(s);
    if (!eqOf.has(yr)) eqOf.set(yr, equityByMonth(a, yr));
    const v = eqOf.get(yr)![calMonth(s)];
    // SHARES, NOT CASH, unless sold when they vest (2026-10-25, the lead's ruling, like his DEC-0179; vestsAreCash): a vest kept
    // as shares moves no month's money (the month grid and the Income summary read it so)
    if (v > 0 && vestsAreCash(op)) put(s, { source: 'Equity vesting', amount: netAt(s, v), gross: v });
  }
  const vests = equityVests(a);
  for (const v of vests) {
    if (vestsAreCash(op) && v.year != null && v.month != null && (v.year * 12 + (v.month - 1)) - nowIdx > 11) laterIn.push({ label: 'Equity vesting', amount: v.amount, month: v.month, year: v.year });
  }
  const notInAMonth = vests
    .filter((v) => v.missing === 'vest date not entered' || (v.missing === 'vest month not entered' && v.year != null && v.year >= startYear && v.year <= yearOfSlot(11)))
    .map((v) => ({ label: 'Equity vesting', amount: v.amount, year: v.year, reason: v.missing! }));
  const benM = toNum(a.benefitMonthly);
  // UNEMPLOYMENT PAY IS TAXED (2026-10-25, FIX-INCOME-B; IRC §85(a)): its own line, after tax; the rest of the benefits untaxed
  const unempM = unemploymentMonthly(op);
  if (benM > 0) { const set = new Set(benefitActiveMonths(op)); for (let s = 0; s < 12; s++) if (set.has(calMonth(s) + 1)) {
    put(s, { source: 'Benefits', amount: benM - unempM });
    if (unempM > 0) put(s, { source: 'Unemployment', amount: netAt(s, unempM), gross: unempM });
  } }
  if (toNum(a.supportMonthly) > 0) for (let s = 0; s < 12; s++) put(s, { source: 'Family support', amount: toNum(a.supportMonthly) });
  // scholarships / student-loan disbursements keep their dated placement (month + optional year), and the day they land when
  // the person gave one (2026-10-24: what is there by a bill's day counts aid that lands before it, and not aid that lands after)
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    const amt = toNum(sc?.amount); if (amt <= 0) continue;
    if (sc?.freq === 'monthly') { for (let s = 0; s < 12; s++) put(s, { source: sc.label || 'Scholarship', amount: amt }); continue; }
    const ms = Array.isArray(sc?.months) && sc.months.length ? sc.months : null;
    if (ms) for (const m of ms) { const s = slotForMY(m, toNum(sc?.year) || undefined); if (s >= 0) put(s, { source: sc.label || 'Scholarship', amount: amt / ms.length, day: toNum(sc?.day) || undefined }); else laterIn.push({ label: sc.label || 'Scholarship', amount: amt / ms.length, month: m, year: toNum(sc?.year) }); }
    else for (let s = 0; s < 12; s++) put(s, { source: sc.label || 'Scholarship', amount: amt / 12 });
  }
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const amt = toNum(ln?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : null;
    if (ms) for (const m of ms) { const s = slotForMY(m, toNum(ln?.year) || undefined); if (s >= 0) put(s, { source: ln.label || 'Loan disbursement', amount: amt, day: toNum(ln?.day) || undefined }); else laterIn.push({ label: ln.label || 'Loan disbursement', amount: amt, month: m, year: toNum(ln?.year) }); }
    else put(0, { source: ln.label || 'Loan disbursement', amount: amt });
  }
  // retirement income: dated rows from F5 when provided; else the flat received-now line (approx)
  if (opts.guaranteedIncome?.length) {
    for (const g of opts.guaranteedIncome) {
      const s = slotForMY(g.month, g.year);
      if (s >= 0) put(s, { source: g.source, amount: g.amount, day: g.day });
      else laterIn.push({ label: g.source, amount: g.amount, month: g.month, year: g.year ?? 0 });
    }
  } else {
    // the tax comes off the part that is taxed — Social Security in the share IRS Publication 915 taxes (2026-10-25, FIX-INCOME-B;
    // retirementIncomeTaxedMonthly, read by the month grid and the Income summary too); a "Not yet" Social Security is not here
    const ret = retirementIncomeTaxedMonthly(op, now);
    const retM = ret.received;
    if (retM > 0) for (let s = 0; s < 12; s++) put(s, { source: 'Retirement income', amount: retM - ret.taxed * rates[calMonth(s)], gross: retM, approx: true });
  }
  // the tax on interest and dividends that are reinvested, under a calculated rate: it comes out of the pay (or the first
  // taxed income) that does land that month — the law in dividends.test.ts, as the income grid and the Income summary take it
  if (invM > 0 && !invLands && !theirs) {
    for (let s = 0; s < 12; s++) {
      const from = income[s].find((i) => i.source === 'Salary (take-home share)') ?? income[s].find((i) => i.gross != null);
      if (from) from.amount -= invM * rates[calMonth(s)];
    }
  }

  // ── bills: named non-monthly items + a reconciling remainder, so Σ billItems(bill) per cell
  //    EQUALS the canonical spendByMonth to the cent (one spend function, agreement-tested) ──
  const spendCal = spendByMonth(op);
  const netMonthlyIncome = (() => { let t = 0; for (const cell of income) for (const i of cell) t += i.amount; return t / 12; })();
  const named: number[] = new Array(12).fill(0);
  for (const c of (Array.isArray(a.spendCats) ? a.spendCats : [])) {
    if (c?.bucket !== 'nonmonthly') continue;
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const yearly = c?.unit === 'pct' ? (amt / 100) * netMonthlyIncome * 12 : amt;
    // A BILL WITH NO MONTH IS A TWELFTH IN EVERY MONTH, as the budget counts it (DEC-7611), carried in the month's regular
    // expenses below with no date of its own (2026-10-25, FIX-BILLS; MK-CF-M-028 "a date nobody gave would be read as one they
    // did"). It was named in January for the whole year while the twelfths stayed in every month: $1,200 became $2,300.
    if (!(Array.isArray(c?.months) && c.months.length)) continue;
    const ms: number[] = c.months;
    const yr = toNum(c?.year) || undefined;                       // one-time bills may carry a YEAR (v1.1)
    for (const m of ms) {
      const s = slotForMY(m, yr);
      // a day past the end of a shorter month is its last day — the 29th of February is the 28th in 2027, never 1 March (tenet 4)
      const due = toNum(c?.dueDay) || undefined;
      const day = due && s >= 0 ? Math.min(due, daysInMonth(yearOfSlot(s), m)) : due;
      const item: GridBillItem = { label: c.label ?? c.id ?? 'Bill', amount: yearly / ms.length, day, kind: 'bill', critical: (c.tier ?? 'flex') === 'critical' };
      if (s >= 0) { bills[s].push(item); named[s] += item.amount; }
      else later.push({ label: item.label, amount: item.amount, month: m, year: yr ?? 0 });
    }
  }
  for (let s = 0; s < 12; s++) {
    const rest = spendCal[calMonth(s)] - named[s];
    if (rest > 0.004) bills[s].push({ label: 'Everyday expenses', amount: rest, kind: 'bill', regular: true });
  }
  // one-time planned items from an adopted plan (kept OUT of the spend reconciliation above —
  // they are additions the plan created, not part of stated everyday expenses)
  for (const o of (opts.oneOffs ?? [])) {
    if (!o || !(o.amount > 0)) continue;
    const s = slotForMY(o.month, o.year);
    const item: GridBillItem = { label: o.label, amount: o.amount, kind: 'bill', critical: o.critical ?? true };
    if (s >= 0) bills[s].push(item);
    else later.push({ label: o.label, amount: o.amount, month: o.month, year: o.year ?? 0 });
  }
  // debt payments: monthly on due_day, starting at first_payment_date, ending at payoff_date — each month asks the one rule,
  // paymentInMonth, that This month's plan asks too (2026-10-24, CF-FIX: the plan counted a loan before its first payment)
  const ymOfSlot = (s: number) => `${startYear + Math.floor((startMonth + s) / 12)}-${String(calMonth(s) + 1).padStart(2, '0')}`;
  for (const d of (opts.liabilities ?? [])) {
    // B47 finding 11 — due-in-full debts are ONE dated lump (the whole balance) in their due month,
    // never a monthly row; beyond the window they surface under "Later" instead of vanishing
    if (paymentShape(d) === 'due_in_full') {
      if (!(d.remaining_balance > 0)) continue;
      const m = d.payoff_date?.match(/^(\d{4})-(\d{2})-?(\d{2})?/);
      if (!m) continue;                        // undated lump: the editor requires a date, but stay safe
      const s = (+m[1] * 12 + (+m[2] - 1)) - nowIdx;
      for (let k = 0; k < 12; k++) {
        const amount = paymentInMonth(d, ymOfSlot(k));
        if (amount > 0) bills[k].push({ label: `${d.label} — due in full`, amount, day: m[3] ? +m[3] : undefined, kind: 'debt', critical: true });
      }
      if (s > 11) later.push({ label: `${d.label} — due in full`, amount: d.remaining_balance, month: +m[2], year: +m[1] });
      continue;
    }
    const pay = requiredPayment(d); if (pay <= 0) continue;
    const startIdx = d.first_payment_date ? (() => { const m = d.first_payment_date.match(/^(\d{4})-(\d{2})/); return m ? (+m[1] * 12 + (+m[2] - 1)) - nowIdx : 0; })() : 0;
    for (let s = 0; s < 12; s++) {
      const amount = paymentInMonth(d, ymOfSlot(s));
      if (amount > 0) bills[s].push({ label: d.label, amount, day: d.due_day, kind: 'debt', regular: true });
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
      incomeItems: income[s].map((i) => ({ ...i, amount: (i.amount), gross: i.gross == null ? undefined : (i.gross) })),
      billItems: bills[s].map((b) => ({ ...b, amount: (b.amount) })),
      inflow: (inflow), outflow: (outflow), net: (inflow - outflow), runningBalance: (bal),
    };
  });
  const shortMonths = cells.filter((c) => c.runningBalance < -0.005).map((c) => c.label);
  return {
    // INCOME THAT HAS LANDED IS NOT "LATER" (2026-10-24, Cash flow journey E2E-70): a one-time payment dated September read
    // "LATER — BEYOND THIS 12-MONTH WINDOW" once September had passed. Money OUT dated in a passed month stays: a bill may still
    // be owed, and is never silently dropped (bill calendar r43; adversarial_pass "a one-time bill dated for a PASSED month")
    cells, later: [...laterIn.filter((l) => !l.year || (l.year * 12 + (l.month - 1)) - nowIdx > 11), ...later], shortMonths,
    lowestBalance: (Math.min(...cells.map((c) => c.runningBalance))),
    totalIn: (totalIn), totalOut: (totalOut),
    ...(notInAMonth.length ? { notInAMonth } : {}),
  };
}

/** What it is for: THE MONTH'S BILLS THAT FALL ON A DATE OF THEIR OWN, read off one month of the table (2026-10-25, FIX-BILLS;
 *  the lead's ruling on the outside review's open case: a large once-a-year bill is on the big-ticket radar in its own month,
 *  and only there — DEC-0002 gives big one-time bills their own list). A once-in-a-while bill in its month and a one-time item an
 *  adopted plan created; never the month's regular expenses, a bill with no month (a twelfth a month), or a debt payment —
 *  a debt is asked of the debts, one rule (paymentInMonth). $1,200 of car insurance due 15 December is December's, not October's. */
/* ─ MK-XS-F-198 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * datedBillsIn
 *
 * Answers ..... What it is for: THE MONTH'S BILLS THAT FALL ON A DATE OF THEIR OWN, read off one month of the table (2026-10-25, FIX-BILLS; the lead's ruling on the outside review's open case: a large once-a-year bill is on the big-ticket radar in its own month, and only there — DEC-0002 gives big one-time bills their own list).
 *
 * Formula .....
 *     cell.bill items (or none when missing) where kind = 'bill' and !regular
 *
 * Called by ... MK-CF-F-107 buildPaycheckYear
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-O-017 futurePaycheck
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-198
 * Changed ..... not in git yet (—)
 */
export function datedBillsIn(cell: GridCell | null | undefined): GridBillItem[] {
  return (cell?.billItems ?? []).filter((b) => b.kind === 'bill' && !b.regular);
}

