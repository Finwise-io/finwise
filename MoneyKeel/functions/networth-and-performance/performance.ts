// Performance · How are my investments doing — the change walk, each account's return, the honest
// comparison.
//
// THE DOOR for Q-PF-1, ruled by the founder 2026-09-27: "yes" — the Performance tab and Home answer
// one question, so the return on Home's card and the return on Performance can never disagree.
//
// THIS DOOR CARRIES FOUR RULINGS THAT WERE EACH PAID FOR ONCE:
//   · ONE MEANING OF RETURN (B-97, 2026-09-25). Every return here is wealth generated ÷ the money
//     working in the window — money-weighted, so money added mid-window does not read as a gain. The
//     screen once showed a price-only return beside a "wealth generated" that counted dividends too:
//     two meanings of return on one card.
//   · THE BEGINNING IS READ, NEVER BACK-FILLED (B-98). It comes from the daily record — which reaches
//     back through a linked account's own transactions — and is only derived when the record cannot
//     reach. Today's share count priced at past dates is a line that never happened.
//   · A RATE NEEDS SOMETHING TO STAND ON. With neither a beginning read from the record nor movement
//     to point at, the window shows nothing — never a confident +0.00%.
//   · A WINDOW LONGER THAN A YEAR SHOWS A YEARLY RATE, and says so (founder, 2026-09-25, after the
//     convention was checked: GIPS forbids annualising under a year and annualises above it, and
//     brokerage statements do the same). His ruling: show BOTH, and label them.
import { declareFigures } from '../_figure-spec';
import { formatMoney } from '../../../src/domain/_shared/money';
import { buildChangeWalk, type ChangeWalk } from '../../../src/domain/history';
import { personalFlowTotals } from '../../../Calculation Module code/engines/ledger';
import { windowBounds, modifiedDietzOverWindow } from '../../../Calculation Module code/engines/window-return';
import { valueOn, covers as snapshotCovers } from '../../../Calculation Module code/engines/snapshots';
import { Dec } from '../../../Calculation Module code/engines/decimal';

export interface WindowFigures {
  /** The first day of the window, or null for "since the record began". */
  windowStart: string | null;
  /** The records inside the window. */
  ledger: any[];
  /** How the beginning became the ending, line by line — the rows always sum to the ending. */
  walk: ChangeWalk;
  /** The beginning as READ from the daily record, or null when the record cannot reach back. */
  measured: number | null;
  /** What the window shows: the yearly rate over a year, otherwise the total. Null when it refuses. */
  ret: number | null;
  /** The total over the window, and the yearly rate — both, always, so the screen can label them. */
  cumulative: number | null;
  perYear: number | null;
  years: number;
  /** Why a refusal, in words. Empty when nothing is refused. */
  sentence: string;
}

/* ─ MK-NW-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * thePerformance
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     flows = personal flow totals(ledger)
 *     contributions = flows.contributions.to number(2)
 *     withdrawals = flows.withdrawals.to number(2)
 *     dividends = flows.dividends.to number(2)
 *     interest = flows.interest.to number(2)
 *     bounds = window bounds(window start, today)   if window start
 *     nothing   otherwise
 *     days = input.snapshot days (or none when missing)
 *     beginning = measured (or ending − input.priced gain − contributions + withdrawals when missing)
 *     years = bounds.days ÷ 365   if bounds
 *     0   otherwise
 *     has basis = measured ≠ nothing (or walk.wealth generated ! = 0 when missing or zero)
 *     refused = verdict ≠ nothing and verdict.rate = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-008
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * thePerformance
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     flows = personal flow totals(ledger)
 *     contributions = flows.contributions.to number(2)
 *     withdrawals = flows.withdrawals.to number(2)
 *     dividends = flows.dividends.to number(2)
 *     interest = flows.interest.to number(2)
 *     bounds = window bounds(window start, today)   if window start
 *     nothing   otherwise
 *     days = input.snapshot days (or none when missing)
 *     beginning = measured (or ending − input.priced gain − contributions + withdrawals when missing)
 *     years = bounds.days ÷ 365   if bounds
 *     0   otherwise
 *     has basis = measured ≠ nothing (or walk.wealth generated ! = 0 when missing or zero)
 *     refused = verdict ≠ nothing and verdict.rate = nothing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-083 PERF
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-083 PERF
 *
 * Serves ...... MK-PF-M-002 · MK-PF-M-003 · MK-PF-M-005
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Treats a year as 365 days.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-008
 * Changed ..... not in git yet (—)
 */
export function thePerformance(input: {
  /** The window's first day, or null for "since the record began". */
  windowStart: string | null;
  /** The words for that window, as the screen says them ("since Jul 19"). */
  windowLabel: string;
  today: string;
  /** What the investments are worth now. */
  ending: number;
  /** Every record, unfiltered — the door takes the window's own. */
  transactions: any[];
  /** The daily record, and which accounts count as investments. */
  snapshotDays: any[];
  investmentAccountIds: Set<string>;
  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record
   *  cannot reach. It never becomes the return. */
  pricedGain: number;
}): WindowFigures {
  const { windowStart, today, ending } = input;
  const ledger = (input.transactions ?? []).filter(
    (t) => !windowStart || String(t.date ?? '').slice(0, 10) >= windowStart);
  const flows = personalFlowTotals(ledger);
  const contributions = flows.contributions.toNumber(2);
  const withdrawals = flows.withdrawals.toNumber(2);
  const dividends = flows.dividends.toNumber(2);
  const interest = flows.interest.toNumber(2);

  const bounds = windowStart ? windowBounds(windowStart, today) : null;
  const days = input.snapshotDays ?? [];
  // READ, never back-filled (B-98)
  const measured = bounds && snapshotCovers(days, bounds.beginningAsOf)
    ? valueOn(days, input.investmentAccountIds, bounds.beginningAsOf) : null;
  const beginning = measured ?? (ending - input.pricedGain - contributions + withdrawals);

  const walk = buildChangeWalk({
    beginning, ending, fromLabel: input.windowLabel, toLabel: 'today',
    contributions, withdrawals, dividends, interest,
  });

  const verdict = bounds ? modifiedDietzOverWindow({
    // money enters the decimal arithmetic at cents — a derived beginning is a float with a long tail
    beginning: Dec.of(beginning.toFixed(2)), ending: Dec.of(ending.toFixed(2)),
    flows: ledger.filter((t: any) => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL')
      .map((t: any) => ({ date: String(t.date ?? '').slice(0, 10) || null,
        amount: (Dec.parse(t.amount) ?? Dec.ZERO).mul(t.type === 'WITHDRAWAL' ? Dec.of('-1') : Dec.of('1')) })),
    start: windowStart!, end: today,
  }) : null;

  const years = bounds ? bounds.days / 365 : 0;
  // a rate needs something to stand on: a beginning read from the record, or movement to point at
  const hasBasis = measured != null || walk.wealthGenerated !== 0;
  const refused = verdict != null && verdict.rate == null;
  const cumulative = hasBasis ? verdict?.rate ?? null : null;
  const perYear = cumulative != null && years > 1 ? Math.pow(1 + cumulative, 1 / years) - 1 : null;

  return {
    windowStart, ledger, walk, measured,
    ret: perYear ?? cumulative,
    cumulative, perYear, years,
    sentence: refused ? verdict!.sentence : '',
  };
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  An investment account worth $30,000 on the last recorded day of 2025 — 100 VTI at $260 plus $4,000
 *  of cash — worth $46,600 on 28 September 2026, with $6,000 paid in on 1 April and $825 of dividends
 *  along the way. Every figure runs `thePerformance`, the real door.
 *
 *  IT IS THE CASE WHERE THE PERCENTAGE IS REFUSED, deliberately. The $6,000 is a fifth of what was
 *  there at the start, so WHEN it arrived would drive any rate more than the investing did, and the
 *  door says so in words instead of printing one (his ruling: one meaning of return, or none).
 *  The dollar walk still answers: $30,000 + $6,000 paid in + $10,600 generated = $46,600.
 */
const EXAMPLE = {
  windowStart: '2026-01-01', windowLabel: 'since Jan 1', today: '2026-09-28', ending: 46600,
  transactions: [
    { txn_id: 'c1', account_id: 'a2', type: 'DEPOSIT', amount: 6000, date: '2026-04-01' },
    { txn_id: 'd1', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 825, date: '2026-06-20' },
  ] as any[],
  snapshotDays: [
    { date: '2025-12-31', origin: 'observed', writtenAt: '2025-12-31T00:00:00Z',
      holdings: [{ accountId: 'a2', holdingId: 'VTI', ticker: 'VTI', units: 100, price: 260, value: 26000 }],
      accounts: [{ date: '2025-12-31', accountId: 'a2', cash: 4000, statedTotal: null, currency: 'USD' }] },
  ] as any[],
  investmentAccountIds: new Set(['a2']),
  pricedGain: 0,
};
const GIVEN =
  'An account worth $30,000 on 31 Dec 2025 (100 VTI at $260 plus $4,000 cash) and $46,600 on 28 Sep 2026, '
  + 'with $6,000 paid in on 1 Apr and $825 of dividends received.';
/* ─ MK-NW-F-083 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * PERF
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the performance(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-083
 * Changed ..... not in git yet (—)
 */
const PERF = () => thePerformance(EXAMPLE);

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const PERFORMANCE_FIGURES = declareFigures({
  'MK-PF-M-001': {
    label: 'Ending value', unit: 'money', screens: ['/invest'],
    answers: 'What your investments are worth at the end of the window you picked.',
    formula: 'the sum of every investment account’s value today',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'Nothing invested yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$46,600',
      run: () => PERF().walk.ending,
    },
  },
  'MK-PF-M-002': {
    label: 'Wealth generated', unit: 'money', screens: ['/invest'],
    answers: 'What the money itself made in the window — not what you added to it.',
    formula: 'ending − beginning − what you put in + what you took out',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-004 the activity records', 'MK-NW-I-003 the recorded history'],
    decisions: ['ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are part of this, so the return beside it counts them too.'],
    refusal: 'The record cannot reach the start of this window, so there is nothing honest to subtract from.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$10,600',
      run: () => PERF().walk.wealthGenerated,
    },
  },
  'MK-PF-M-003': {
    label: 'HOW $X BECAME $Y · ALL ACCOUNTS', unit: 'words', screens: ['/invest'],
    answers: 'Every line that took the beginning to the ending, so it can be checked by eye.',
    formula: 'beginning + contributions − withdrawals + wealth generated = ending, by construction',
    inputs: ['MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: ['Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped.'],
    refusal: 'No beginning to walk from.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: 'HOW $30,000 BECAME $46,600 · ALL ACCOUNTS',
      run: () => `HOW ${formatMoney(PERF().walk.beginning)} BECAME ${formatMoney(PERF().walk.ending)} · ALL ACCOUNTS`,
    },
  },
  'MK-PF-M-004': {
    label: 'Ending market value (per account)', unit: 'money', screens: ['/invest'], grain: 'one account',
    answers: 'What one account is worth at the end of the window.',
    formula: 'the sum of that account’s holdings, at today’s prices, plus its cash',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-005 the price feed'],
    refusal: 'Nothing in it.',
    ruled: '2026-09-27',
  },
  'MK-PF-M-005': {
    label: 'each account and its ending value', unit: 'money', screens: ['/invest'], grain: 'one account',
    answers: 'One line per account, and what it is worth — the parts that sum to the whole above.',
    formula: 'each investment account’s value, named by the account',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Named by ACCOUNT, not by institution — two accounts at one broker must be tellable apart (founder screenshot, 2026-08-17).'],
    refusal: 'One account only — the whole walk above already says it.',
    ruled: '2026-09-27',
  },
});
