/**  WHAT YOUR OWN ACCOUNTS PAY YOU — calculated, with the working shown.
 *
 *  The app holds the accounts, so it can calculate this rather than ask. Asking invites a second,
 *  different answer to one question with nothing to reconcile them (approved mock income-v5, 3c).
 *
 *  IT DOES NOT ADD UP HISTORY AND FORECAST. Three screens showed
 *  `investmentIncomeAnnual(transactions) + interestIncomeAnnual(accounts)` — the coupons actually
 *  received in the last year, PLUS the coupons those same bonds are expected to pay. A $10,000
 *  Treasury at 5% that had paid its $500 was shown as $1,000 of income. This answers one question
 *  only: what will these accounts pay in a year, from the rates on the accounts themselves.
 *
 *  WHAT IT CANNOT SEE. Dividends from shares and funds. Nothing in the app records a dividend yield,
 *  and inventing one would be a guess dressed as a figure. So the total says what it covers, and the
 *  person can correct it — which is the honest shape when the data is partial.
 */
import type { AssetAccount } from '../assets';
import { assetClassOf, taxTreatmentOf } from '../assets';
import { money } from '../_shared/num';
import { plural } from '../_shared/plural';
import { isoLocalDate, dateShown } from '../_shared/dates';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
// a bond's or CD's year of interest has ONE rule (MK-NW-F-126 yearlyInterestNow, DEC-2748c/d) — read here, never re-derived
import { bondInfo, yearlyInterestNow, isPastMaturity, heldBondInterest } from '../bonds';
import { percentDigits } from '../../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)

export interface AccountIncomeLine {
  label: string;        // the account, as the person named it
  why: string;          // how we got the figure — the rate and what it was applied to
  annual: number;
  assumed: boolean;     // true when we fell back to a default rate rather than one they gave
}

export interface AccountIncome {
  annual: number;
  lines: AccountIncomeLine[];
  covers: string;       // what is in the figure, in words
  missing: string | null;   // what we know we cannot see
}

/** A rate as the person would say it: 3.80%, not 0.038. Named for what it does, and named
 *  uniquely — `pct` already means something on the bonds screen. */
/* ─ MK-CF-F-182 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * asPercent
 *
 * Answers ..... A rate as the person would say it: 3.80%, not 0.038.
 *
 * Formula .....
 *     the answer = (r × 100) followed by '%'
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts · MK-CF-F-316 bondWhy
 *
 * Reaches ..... 485 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 467 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-182
 * Changed ..... not in git yet (—)
 */
const asPercent = (r: number) => `${percentDigits(r, 2)}%`;
// TWO DECIMALS, ALWAYS (2026-10-31, FX-CF-B, IN3-04; his Q49 and DEC-0221 "Return on cash - use 2 decimals"; v07 row of that day):
// "3.80% on $18,400" beside a CD's "5.05%" — one form for one kind of figure (tenet 4). It cut trailing zeros: "3.8%", "4%".

/** What each account's holdings PAID in a window — the trailing twelve months ending today unless a window is handed in —
 *  by account: cash payouts and reinvested ones alike (his DEC-0179: reinvested income is still taxed), never a record dated
 *  after today; a payout whose amount is not on record is counted by account into `notOnRecord`, never as $0. */
/* ─ MK-CF-F-183 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * paidOutByAccount
 *
 * Answers ..... What each account's holdings PAID in a window — the trailing twelve months ending today unless a window is handed in — by account: cash payouts and reinvested ones alike (his DEC-0179: reinvested income is still taxed), never a record dated after today; a payout whose amount is not on record is counted by account into `notOnRecord`, never as $0.
 *
 * Formula .....
 *     today = iso local date(now)
 *     from = window.from (or iso local date(new date(now.get full year() − 1, now.get month(), now.get date())) when missing)
 *     to = window.to   if window.to ≠ nothing and window.to < today
 *     today   otherwise
 *     out = new map<string, number>()
 *     date = string(date ?? '')
 *     id = string(account id ?? '')
 *     shares = shares), price = number(price read as a number
 *     amount = money into account(t) (or shares × price   if reinvested and shares > 0 and price > 0
 *     nothing   otherwise when missing)
 *     the answer = out
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts · MK-CF-F-264 interestAndDividendsForYear
 *
 * Reaches ..... 484 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 466 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-183
 * Changed ..... not in git yet (—)
 */
function paidOutByAccount(
  txns: any[] | null | undefined, now: Date,
  window?: { from: string; to: string } | null,
  notOnRecord?: Map<string, number>,
): Map<string, number> {
  // THE WINDOW ENDS TODAY (2026-10-25, outside audit part 5 MK-CF-F-183-C05 and the screens check MK-CF-M-066): it had a start
  // and no end, so a $1,000 payout dated tomorrow read as paid and the $500 the account's rate gives was never shown. The
  // trailing twelve months are the twelve months ending today (DEC-7171); a tax year is that calendar year, never past today.
  const today = isoLocalDate(now);
  const from = window?.from ?? isoLocalDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  const to = window?.to != null && window.to < today ? window.to : today;
  const out = new Map<string, number>();
  for (const t of txns ?? []) {
    if (!['DIVIDEND', 'INTEREST', 'COUPON'].includes(String(t?.type))) continue;
    const date = String(t?.date ?? '');
    if (date < from || date > to) continue;
    const id = String(t?.account_id ?? '');
    if (!id) continue;
    // A REINVESTED PAYOUT IS INCOME TOO (2026-10-25, his DEC-0179 clause 2 "the tax on them still comes out", DEC-0198; the
    // screens check MK-CF-M-066): it was skipped, so a dividend logged as reinvested — 1.2 VTI at $100 — left a $540 year
    // reading $420 on Interest & dividends, under words saying these are counted as income you are taxed on. "Paid out" is
    // paid by the holding, whether the money then sat as cash or bought more shares. A reinvested record that carries no
    // amount is worth the shares it bought × their price.
    // the one rule for a stored amount (moneyIntoAccount, 2026-10-21): a −$50 dividend — a reversal — cancels, never adds
    const shares = Number(t?.shares), price = Number(t?.price);
    const amount = moneyIntoAccount(t) ?? (t?.reinvested && shares > 0 && price > 0 ? shares * price : null);
    if (amount == null) {
      // AN AMOUNT NOT ON RECORD IS NAMED, NEVER $0 (2026-10-25, MK-CF-F-183, DEC-3523 tenet 3): it was added as $0 into a total
      // that read as complete. It is counted here, by account, for the caller to say.
      if (notOnRecord) notOnRecord.set(id, (notOnRecord.get(id) ?? 0) + 1);
      continue;
    }
    out.set(id, ((out.get(id) ?? 0) + amount));
  }
  return out;
}

/** What it is for: whether the interest and dividends an account pays are taxed in the year they are paid — every account
 *  but a pre-tax one (an IRA, a 401(k), an HSA) and a Roth one (a Roth IRA, a 529), whose income is not taxed when it is
 *  paid (IRS Publication 550). An account with no tax type stated counts as taxed, as the draw-order split counts it
 *  (DEC-4105). The one test Interest & dividends and the Tax organizer both read (2026-10-25). */
/* ─ MK-CF-F-263 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * incomeIsTaxedWhenPaid
 *
 * Answers ..... What it is for: whether the interest and dividends an account pays are taxed in the year they are paid — every account but a pre-tax one (an IRA, a 401(k), an HSA) and a Roth one (a Roth IRA, a 529), whose income is not taxed when it is paid (IRS Publication 550).
 *
 * Formula .....
 *     t = tax treatment of(a)
 *     the answer = t ! = 'tax_deferred' and t ! = 'tax_free'
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts · MK-CF-F-264 interestAndDividendsForYear
 *
 * Reaches ..... 484 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 466 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-263
 * Changed ..... not in git yet (—)
 */
function incomeIsTaxedWhenPaid(a: AssetAccount): boolean {
  const t = taxTreatmentOf(a);
  return t !== 'tax_deferred' && t !== 'tax_free';
}

/** A bond's or CD's line, in words, written in one place for an account that is the bond and for a bond held inside one (2026-11-02) */
/* ─ MK-CF-F-316 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bondWhy
 *
 * Answers ..... A bond's or CD's line, in words, written in one place for an account that is the bond and for a bond held inside one (2026-11-02)
 *
 * Formula .....
 *     `${as percent(rate)} coupon on ${money(face as number)} face`   when kind = 'face'
 *     `${as percent(rate)} on ${money(balance)}`   when kind = 'balance'
 *     `${as percent(rate)} coupon — face value not entered, so ${tail}`
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts
 *
 * Reaches ..... 484 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 466 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-316
 * Changed ..... not in git yet (—)
 */
function bondWhy(kind: 'face' | 'balance' | 'no face', rate: number, face: number | null, balance: number, tail = ''): string {
  if (kind === 'face') return `${asPercent(rate)} coupon on ${money(face as number)} face`;
  if (kind === 'balance') return `${asPercent(rate)} on ${money(balance)}`;
  return `${asPercent(rate)} coupon — face value not entered, so ${tail}`;
}

/** One line per account that pays something, and the total.
 *
 *  PER ACCOUNT, ONE ANSWER. Where the record shows what an account actually paid in the last year,
 *  that is the figure — it happened. Where it does not, the rate on the account is projected. The
 *  two are never added: three screens did add them, and a $10,000 Treasury at 5% that had paid its
 *  $500 was shown as $1,000 of income. */
/* ─ MK-CF-F-184 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeFromAccounts
 *
 * Answers ..... One line per account that pays something, and the total.
 *
 * Formula .....
 *     not on record = new map<string, number>()
 *     paid = paid out by account(transactions, now, nothing, not on record)
 *     lines = []
 *     amountless = []
 *     unseen = []
 *     cls = asset class of(a)
 *     label = string((a as any).label or (a as any).institution or 'Account')
 *     balance = (a as any).balance (or 0 when missing or zero)
 *     rate = (a as any).coupon rate (or 0 when missing or zero)
 *     actual = paid.get(string((a as any).asset id ?? ''))
 *     no amount = not on record.get(string((a as any).asset id ?? '')) (or 0 when missing)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-207 SOURCE · MK-CF-F-264 interestAndDividendsForYear
 *
 * Reaches ..... 484 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 466 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If coupon rate is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-184
 * Changed ..... not in git yet (—)
 */
export function incomeFromAccounts(
  accounts: AssetAccount[] | null | undefined,
  transactions?: any[] | null,
  now: Date = new Date(),
): AccountIncome {
  const notOnRecord = new Map<string, number>();
  const paid = paidOutByAccount(transactions, now, null, notOnRecord);
  const lines: AccountIncomeLine[] = [];
  // payouts with no amount on record, named by account (2026-10-25, MK-CF-F-183, DEC-3523 tenet 3)
  const amountless: string[] = [];
  // Accounts that hold money and produced no line. Naming them by CLASS was wrong: assetClassOf
  // answers 'mixed' for a brokerage, an IRA and a 401(k) — the ordinary cases — so a check for
  // 'stocks_etf' saw none of them and the app claimed to have covered everything.
  const unseen: string[] = [];

  for (const a of accounts ?? []) {
    // ONLY ACCOUNTS WHOSE INCOME IS TAXED (2026-10-25): the screen counts these as income you are taxed on, and income inside
    // a pre-tax or Roth account is not taxed when it is paid — so an IRA's reinvested dividends, now counted as income
    // (DEC-0179), are not added to the taxed figure, and such an account is not listed as missing either
    if (!incomeIsTaxedWhenPaid(a)) continue;
    const cls = assetClassOf(a);
    const label = String((a as any).label || (a as any).institution || 'Account');
    const balance = (a as any).balance || 0;
    const rate = (a as any).coupon_rate || 0;
    const actual = paid.get(String((a as any).asset_id ?? ''));
    const noAmount = notOnRecord.get(String((a as any).asset_id ?? '')) ?? 0;
    if (noAmount > 0) amountless.push(`${plural(noAmount, 'payment')} from ${label}`);
    if (actual != null && actual > 0) {
      // the window in its one name (Q35, 2026-10-21, DEC-7171; canon row 23): the twelve months ending today, as Holding detail says it
      lines.push({ label, why: 'paid out over the trailing twelve months', annual: actual, assumed: false });
      continue;                                       // it happened; nothing to project
    }

    if (cls === 'bonds') {
      // THE ONE RULE (2026-10-24): this line read face × rate, else rate × balance, by its own arithmetic — a second rule for
      // the figure the Bonds screen and the account page print. So a bond with its face left blank read 4.5% of its market
      // value ($1,089 for a $25,000-face Treasury worth $24,200, which pays $1,125), and a bond past its maturity date kept
      // its year's coupon here while every other figure counted $0 (DEC-2748d). It now reads yearlyInterestNow, and each
      // line says which of its cases it is.
      const b = bondInfo(a);
      const yearly = yearlyInterestNow(b, now);
      if (b.couponRate == null) {
        // A46 (founder, 2026-08-26): if the coupon rate is not available use 0 — named, never a built-in yield
        lines.push({ label, why: `no coupon rate entered — counted as $0 on ${money(balance)} until one is`, annual: 0, assumed: true });
      } else if (yearly == null) {
        // a dated bond with a rate and no face value: its coupon is paid on the face (DEC-3523 tenet 3), so nothing is counted, said so
        lines.push({ label, why: bondWhy('no face', b.couponRate, null, balance, 'counted as $0 until it is'), annual: 0, assumed: true });
      } else if (isPastMaturity(b.maturity, now)) {
        lines.push({ label, why: `matured ${dateShown(b.maturity)} — it pays no more interest`, annual: 0, assumed: false });
      } else if (b.face != null) {
        lines.push({ label, why: bondWhy('face', b.couponRate, b.face, balance), annual: yearly, assumed: false });
      } else {
        // a CD bought from the bank typed by its balance, or a bond fund: its rate on that balance (DEC-2748c, DEC-3837)
        lines.push({ label, why: bondWhy('balance', b.couponRate, null, balance), annual: yearly, assumed: false });
      }
      continue;
    }
    if (cls === 'cash' && rate > 0) {
      lines.push({ label, why: `${asPercent(rate)} on ${money(balance)}`, annual: (rate * balance), assumed: false });
      continue;
    }
    if (a.kind === 'foreign_currency') continue;   // Q08 (founder, 2026-08-26): cash held in that currency — no interest, nothing to count or to miss
    // A BOND OR CD HELD INSIDE THE ACCOUNT (2026-11-02, FX-NW; his DEC-2748c): face × rate, by the one reader — named, and named as not
    // counted when its rate or face is missing. An account whose payouts are on record took the record above, so nothing is added twice.
    const held = heldBondInterest(a, now);
    for (const h of held) {
      const named = `${h.label} (in ${label})`;
      if (h.why === 'counted') lines.push({ label: named, why: bondWhy('face', h.couponRate as number, h.face, 0), annual: h.yearly as number, assumed: false });
      else if (h.why === 'matured') lines.push({ label: named, why: 'matured — it pays no more interest', annual: 0, assumed: false });
      else lines.push({ label: named, why: h.why === 'no rate' ? 'no coupon rate entered — not counted until one is' : bondWhy('no face', h.couponRate as number, null, 0, 'not counted until it is'), annual: 0, assumed: true });
    }
    const othersHeld = ((a as any).positions ?? []).length > held.length;
    if (balance > 0 && (held.length === 0 || othersHeld)) unseen.push(label);
  }

  return {
    annual: (lines.reduce((t, l) => t + l.annual, 0)),
    lines,
    covers: 'interest and coupons from the accounts you entered',
    missing: [
      amountless.length ? `Not counted: ${amountless.join(', ')} — amount not on record.` : '',
      unseen.length
        ? `Not counted: ${unseen.slice(0, 3).join(', ')}${unseen.length > 3 ? ` and ${unseen.length - 3} more` : ''}. `
          + 'We do not hold a dividend yield for shares and funds, so we cannot say what they pay — add it below if you know.'
        : '',
    ].filter(Boolean).join(' ') || null,
  };
}

/** Where the year's interest-and-dividends figure came from — the four answers, in the order they are tried. */
export type InterestAndDividendsBasis = 'records' | 'entered' | 'calculated' | 'not entered';
export interface InterestAndDividendsForYear {
  year: number;
  /** null when nothing is known: no record in the year, nothing entered and no account with a rate — "not entered" */
  amount: number | null;
  basis: InterestAndDividendsBasis;
  /** true only for the figure calculated from the accounts' own rates — printed with ≈ and its working */
  approx: boolean;
  /** the working, one line per account: the year's records, or each account's rate on its balance */
  lines: AccountIncomeLine[];
  /** what the figure is, in words, for the line beside it */
  said: string;
  /** payouts in the year whose amount is not on record (named, never counted as $0) */
  notOnRecord: number;
}

/** What it is for: THE ONE interest-and-dividends figure for a tax year — the lead's ruling of 2026-10-25, from his DEC-0179
 *  (interest and dividends are calculated from the accounts, taxed, and not spendable unless they reach the bank) and the
 *  figure's own rule ("records where they exist"). Tried in this order, the first that answers wins:
 *    1 · RECORDS for that calendar year (his DEC-0298: "a tax figure requires a YEAR") — the payouts the accounts recorded from
 *        1 January to the end of the year, never past today, reinvested ones counted (DEC-0179 clause 2), a reversal
 *        cancelling, read by the one rule Interest & dividends reads (MK-CF-F-183 paidOutByAccount); only accounts whose
 *        income is taxed when it is paid (a pre-tax or Roth account is left out, IRS Publication 550);
 *    2 · ENTERED — the yearly figure the person typed on Interest & dividends (invAnnual), a typed $0 included;
 *    3 · CALCULATED from the accounts' own rates — each bond's coupon and each cash account's rate on its balance, the
 *        working shown line by line, the figure marked ≈ (MK-CF-F-184 with no records);
 *    4 · NOT ENTERED — no number (tenet 3).
 *  Full precision (DEC-0264): $731.17 + $611.43 is $1,342.60. Spendable take-home still leaves it out unless the person says
 *  it reaches the bank (DEC-0198) — that is the month grid's rule, not this figure's.
 *  Example (2026): $500 paid 2025-11-14 and $700 paid 2026-03-13 → $700, records (the twelve months ending today read $1,200);
 *  no record and $1,000 typed → $1,000, entered; neither, $10,000 of savings at 4% → ≈$400, calculated, "4% on $10,000". */
/* ─ MK-CF-F-264 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * interestAndDividendsForYear
 *
 * Answers ..... What it is for: THE ONE interest-and-dividends figure for a tax year — the lead's ruling of 2026-10-25, from his DEC-0179 (interest and dividends are calculated from the accounts, taxed, and not spendable unless they reach the bank) and the figure's own rule ("records where they exist").
 *
 * Formula .....
 *     not on record = new map<string, number>()
 *     paid = paid out by account(transactions, now, { from: `${year}-01 − 01`, to: `${year}-12 − 31` }, not on record)
 *     recorded = nothing, missing = 0
 *     record lines = []
 *     id = string((a as any).asset id ?? '')
 *     v = paid.get(id)
 *     the answer:
 *     year = year
 *     amount = recorded
 *     basis = 'records'
 *     approx = false
 *     lines = record lines
 *     said = `from your accounts' records for ${year}`
 *     not on record = missing
 *     typed = op.inv annual
 *     rated = income from accounts(accounts, [], now).lines where annual > 0 and !assumed
 *
 * Called by ... MK-CF-F-084 taxableAnnual · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-F-275 profileWithAccountIncome · MK-CF-O-007 theTaxOrganizer
 *
 * Reaches ..... 484 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 466 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If recorded is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-264
 * Changed ..... not in git yet (—)
 */
export function interestAndDividendsForYear(
  op: Record<string, any> | null | undefined,
  accounts: AssetAccount[] | null | undefined,
  transactions: any[] | null | undefined,
  year: number,
  now: Date = new Date(),
): InterestAndDividendsForYear {
  // 1 · the year's records
  const notOnRecord = new Map<string, number>();
  const paid = paidOutByAccount(transactions, now, { from: `${year}-01-01`, to: `${year}-12-31` }, notOnRecord);
  let recorded: number | null = null, missing = 0;
  const recordLines: AccountIncomeLine[] = [];
  for (const a of accounts ?? []) {
    if (!incomeIsTaxedWhenPaid(a)) continue;
    const id = String((a as any).asset_id ?? '');
    const v = paid.get(id);
    if (v != null) {
      recorded = (recorded ?? 0) + v;
      recordLines.push({ label: String((a as any).label || (a as any).institution || 'Account'), why: `recorded in ${year}`, annual: v, assumed: false });
    }
    missing += notOnRecord.get(id) ?? 0;
  }
  if (recorded != null) {
    return { year, amount: recorded, basis: 'records', approx: false, lines: recordLines, said: `from your accounts' records for ${year}`, notOnRecord: missing };
  }
  // 2 · the figure the person typed
  const typed = op?.invAnnual;
  if (typed != null && String(typed).trim() !== '' && Number.isFinite(Number(typed))) {
    return { year, amount: Number(typed), basis: 'entered', approx: false, lines: [], said: 'you entered', notOnRecord: missing };
  }
  // 3 · calculated from the accounts' own rates (no records: incomeFromAccounts projects each account's rate)
  const rated = incomeFromAccounts(accounts, [], now).lines.filter((l) => l.annual > 0 && !l.assumed);
  if (rated.length) {
    return { year, amount: rated.reduce((t, l) => t + l.annual, 0), basis: 'calculated', approx: true, lines: rated,
             said: `calculated from your accounts — ${rated.map((l) => l.why).join(' · ')}`, notOnRecord: missing };
  }
  // 4 · not entered
  return { year, amount: null, basis: 'not entered', approx: false, lines: [], said: 'not entered', notOnRecord: missing };
}
