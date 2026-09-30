// Net worth · What is this one account worth, what is inside it, and what happened in it.
//
// THE DOOR for Q-NW-2, ruled by the founder 2026-09-27 ("yes"): an account's own page and the
// itemise screen answer ONE question, so they read one answer and cannot disagree about what an
// account holds.
//
// TWO THINGS THIS DOOR REFUSES TO GUESS, both founder findings already paid for once:
//   · income belongs to a holding only when the record says WHICH holding it came from. An
//     untickered dividend row used to match every non-stock holding, so a CD showed "$16,907
//     dividends" — which a CD cannot pay — and two CDs showed the same figure twice (2026-08-11).
//     Untickered income is real and is counted at the ACCOUNT level, where it belongs.
//   · a class breakdown exists only for a linked account. A hand-entered lump has no inside until
//     someone itemises it, and inventing one would be a number nobody entered.
import { declareFigures } from '../_figure-spec';
import type { AssetAccount } from '../../../src/domain/assets';
import { accountClassBreakdown, ASSET_CLASS_LABEL } from '../../../src/domain/assets';
import { itemizedTotal, itemizeRemainder, type ItemHolding } from '../../../src/domain/assets/itemize';
import { personalFlowTotals } from '../../../Calculation Module code/engines/ledger';

export interface ClassSlice { key: string; label: string; value: number; }
export interface HoldingIncome { dividends: number; interest: number; words: string; }

export interface TheAccount {
  accountId: string;
  label: string;
  /** What the account is worth today — the ONE figure the band, the trio and the Total row all print. */
  marketValue: number;
  /** Dividends and interest this account has actually received. Never estimated, never back-filled. */
  income: number;
  /** What is inside it, by class. Null for an account that is not linked: there is nothing to read. */
  inside: ClassSlice[] | null;
  /** How many records the ledger holds for it. */
  activityCount: number;
  /** The income of one holding, by ticker — blank when the record does not say which holding paid. */
  incomeOfHolding: (ticker: string | null | undefined) => HoldingIncome;
}

export interface Itemising {
  /** The lump being itemised — its total never moves while its inside is filled in. */
  keepTotalAt: number;
  itemised: number;
  remainder: number;
}

/* ─ MK-NW-O-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theAccount
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ledger = input.transactions (or none when missing) where string(account id) = string(account.asset id)
 *     income = personal flow totals(ledger.filter((t) => type = 'DIVIDEND' or type = 'INTEREST'))
 *     breakdown = account class breakdown(account)
 *     tk = string(ticker ?? '').trim().to upper case()
 *     f = personal flow totals(rows)
 *     dividends = dividends.to number(2)
 *     interest = interest.to number(2)
 *     parts = []
 *     the answer:
 *     dividends = dividends
 *     interest = interest
 *     words = parts.join(' · ')
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-NW-M-019 · MK-NW-M-020 · MK-NW-M-021 · MK-NW-M-038
 *               MK-NW-M-039 · MK-NW-M-040
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-002
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theAccount
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     ledger = input.transactions (or none when missing) where string(account id) = string(account.asset id)
 *     income = personal flow totals(ledger.filter((t) => type = 'DIVIDEND' or type = 'INTEREST'))
 *     breakdown = account class breakdown(account)
 *     tk = string(ticker ?? '').trim().to upper case()
 *     f = personal flow totals(rows)
 *     dividends = dividends.to number(2)
 *     interest = interest.to number(2)
 *     parts = []
 *     the answer:
 *     dividends = dividends
 *     interest = interest
 *     words = parts.join(' · ')
 *
 * Called by ... MK-NW-F-075 ACC
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC
 *
 * Serves ...... MK-NW-M-019 · MK-NW-M-020 · MK-NW-M-021 · MK-NW-M-038
 *               MK-NW-M-039 · MK-NW-M-040
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-002
 * Changed ..... not in git yet (—)
 */
export function theAccount(input: {
  account: AssetAccount;
  transactions: any[];
}): TheAccount {
  const { account } = input;
  const ledger = (input.transactions ?? []).filter((t) => String(t.account_id) === String(account.asset_id));
  const income = personalFlowTotals(ledger.filter((t) => t.type === 'DIVIDEND' || t.type === 'INTEREST'));

  const breakdown = accountClassBreakdown(account);
  const inside = breakdown
    ? (Object.keys(breakdown) as (keyof typeof breakdown)[])
        .filter((k) => breakdown[k] !== 0)
        .map((k) => ({ key: String(k), label: (ASSET_CLASS_LABEL as any)[k] ?? String(k), value: breakdown[k] }))
    : null;

  const incomeOfHolding = (ticker: string | null | undefined): HoldingIncome => {
    const tk = String(ticker ?? '').trim().toUpperCase();
    // a row with no ticker names no holding, so it belongs to none of them
    const rows = !tk ? [] : ledger.filter((t) => (t.type === 'DIVIDEND' || t.type === 'INTEREST')
      && !!t.ticker && String(t.ticker).toUpperCase() === tk);
    const f = personalFlowTotals(rows);
    const dividends = f.dividends.toNumber(2);
    const interest = f.interest.toNumber(2);
    const parts: string[] = [];
    if (dividends > 0) parts.push(`${Math.round(dividends)} dividends`);
    if (interest > 0) parts.push(`${Math.round(interest)} interest`);
    return { dividends, interest, words: parts.join(' · ') };
  };

  return {
    accountId: String(account.asset_id),
    label: account.label,
    marketValue: account.balance || 0,
    income: income.dividends.add(income.interest).toNumber(2),
    inside,
    activityCount: ledger.length,
    incomeOfHolding,
  };
}

/* ─ MK-NW-F-073 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * itemising
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-075 ACC
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-073
 * Changed ..... not in git yet (—)
 */
export function itemising(lumpBalance: number, items: ItemHolding[]): Itemising {
  return {
    keepTotalAt: lumpBalance,
    itemised: itemizedTotal(items),
    remainder: itemizeRemainder(lumpBalance, items),
  };
}

/** THE WORKED EXAMPLE — ONE ACCOUNT, EVERY FIGURE ON THIS DOOR (six steps, step 6, 2026-09-28).
 *
 *  A linked Fidelity brokerage worth $46,600: $6,000 sitting in cash and 140 shares of VTI marked at
 *  $290. Its ledger holds two dividends, one buy and one sell. Every figure below runs `theAccount` —
 *  the real door — so the example printed on the master file's row is what the code gives.
 *
 *  It is a LINKED account on purpose: only a linked account has an inside, because only there did
 *  somebody other than the person say what the money is in. A hand-entered lump has no breakdown and
 *  the door refuses to invent one.
 */
const EXAMPLE_POSITION = { position_id: 'p1', ticker: 'VTI', label: 'Vanguard Total Market', unit: 'shares',
  last_price: 290,
  lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 210, purchase_date: '2023-03-15' },
         { lot_id: 'l2', shares: 40, cost_per_share: 265, purchase_date: '2026-06-01' }] } as any;
const EXAMPLE_LEDGER = [
  { txn_id: 't1', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 420, date: '2026-06-20' },
  { txn_id: 't2', account_id: 'a2', ticker: 'VTI', type: 'DIVIDEND', amount: 405, date: '2026-03-20' },
  { txn_id: 't3', account_id: 'a2', ticker: 'VTI', type: 'BUY', shares: 20, price: 200, amount: 4000, date: '2024-02-01' },
  { txn_id: 't4', account_id: 'a2', ticker: 'VTI', type: 'SELL', shares: 20, price: 285, amount: 5700, date: '2026-08-10' },
] as any[];
const EXAMPLE_ACCOUNT = { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 46600, target_return: 0.07, source: 'connected', cash_balance: 6000,
  positions: [EXAMPLE_POSITION] } as any;
const GIVEN =
  'A linked Fidelity brokerage worth $46,600: $6,000 in cash and 140 shares of VTI marked at $290 '
  + '($40,600). Its records: dividends of $420 and $405, a buy of 20 shares at $200, a sell of 20 at $285.';
/* ─ MK-NW-F-075 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * ACC
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-075
 * Changed ..... not in git yet (—)
 */
const ACC = () => theAccount({ account: EXAMPLE_ACCOUNT, transactions: EXAMPLE_LEDGER });

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const ACCOUNT_FIGURES = declareFigures({
  'MK-NW-M-018': {
    label: 'Market value', unit: 'money', screens: ['/account-detail'], grain: 'one account',
    answers: 'What this account is worth today.',
    formula: 'the account’s balance — for a linked account the broker’s own figure, for one entered by hand the value entered',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'An account with no value shows nothing rather than $0.',
    note: 'ONE string for this figure: the band, the trio and the Total row all print it, so one screen cannot show three roundings of one number.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$46,600',
      run: () => ACC().marketValue,
    },
  },
  'MK-NW-M-019': {
    label: 'Income', unit: 'money', screens: ['/account-detail'], grain: 'one account',
    answers: 'The dividends and interest this account has actually received.',
    formula: 'the sum of the dividend and interest rows the ledger holds for this account',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-004 the activity records'],
    decisions: ['Never estimated. A broker that shares no income records leaves this blank rather than showing a made-up $0.'],
    refusal: 'No records — it says so instead of showing zero.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$825',
      run: () => ACC().income,
    },
  },
  'MK-NW-M-020': {
    label: 'each asset class inside the account', unit: 'money', screens: ['/account-detail'], grain: 'one class in one account',
    answers: 'What each kind of thing inside this account is worth — cash, bonds, stocks, alternatives.',
    formula: 'the cash sleeve, plus each holding’s shares × its last price, added up by class',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Only a LINKED account has an inside to read. A hand-entered lump has none until someone itemises it.'],
    refusal: 'Not linked — the screen shows the itemise door instead of inventing a breakdown.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$40,600',
      run: () => ACC().inside!.find((c) => c.key === 'stocks_etf')!.value,
    },
  },
  'MK-NW-M-021': {
    label: 'Income: <amount> on a holding row', unit: 'words', screens: ['/account-detail'], grain: 'one holding',
    answers: 'What this one holding has paid you, from the records that name it.',
    formula: 'the dividend and interest rows whose ticker IS this holding’s ticker; nothing when the record names no holding',
    inputs: ['MK-NW-I-004 the activity records'],
    decisions: [
      'FOUNDER FINDING 2026-08-11: a record with no ticker names no holding. It used to match every non-stock holding, '
      + 'so a CD showed dividends it cannot pay and two CDs showed one figure twice. Untickered income is counted at the '
      + 'ACCOUNT level instead, where it belongs.',
    ],
    refusal: 'No record naming this holding — the line does not appear at all.',
    ruled: '2026-09-27',
    note: 'WHAT THE WORKED EXAMPLE SHOWED UP (2026-09-28): the door hands back "825 dividends" with no dollar sign, and AccountDetailScreen puts one on afterwards with a regular expression. The composing is split across two places, which is what rule 11 exists to stop. The example states the door\'s own output, not the screen\'s, so the row does not claim more than the door does. Not fixed here: moving the writing into the door changes what a screen prints, which is a caller move and needs its own step.',
    worked: {
      given: GIVEN,
      answer: '825 dividends',
      run: () => ACC().incomeOfHolding('VTI').words,
    },
  },
  'MK-NW-M-022': {
    label: 'ACTIVITY — n records', unit: 'count', screens: ['/account-detail'], grain: 'one account',
    answers: 'How many records this account has: what has happened in it.',
    formula: 'the count of ledger rows for this account',
    inputs: ['MK-NW-I-004 the activity records'],
    refusal: 'None yet — the section keeps its heading and says so.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '4',
      run: () => ACC().activityCount,
    },
  },
  'MK-NW-M-038': {
    label: 'We keep the total at $X', unit: 'money', screens: ['/itemize'], grain: 'one account',
    answers: 'The figure the account must still add up to while you say what is inside it.',
    formula: 'the lump account’s balance, unchanged by itemising',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Itemising describes what is inside an account; it never changes what the account is worth.'],
    refusal: 'Nothing to itemise.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$46,600',
      run: () => itemising(46600, [{ value: 40600 }] as any).keepTotalAt,
    },
  },
  'MK-NW-M-039': {
    label: '$X of $Y itemized · remainder', unit: 'money', screens: ['/itemize'], grain: 'one account',
    answers: 'How much of the account you have placed, and how much is still unplaced.',
    formula: 'the sum of the items entered; the remainder is the balance minus that sum',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'Nothing entered yet — it reads $0 of the balance.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$40,600',
      run: () => itemising(46600, [{ value: 40600 }] as any).itemised,
    },
  },
  'MK-NW-M-040': {
    label: 'each holding and its value', unit: 'money', screens: ['/itemize'], grain: 'one holding',
    answers: 'One line per thing you have said is inside this account, and what it is worth.',
    formula: 'the value of each thing inside the account, listed under the class it belongs to',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-004 holding quantity (shares)', 'MK-XS-I-005 holding price'],
    decisions: [
      'A CLASS HOLDING NOTHING IS NOT LISTED \u2014 a $0 line reads as "we checked and it is empty", which is a different claim from "there is none".',
      'Uninvested money in the account is one of the lines, under the words he ruled on 2026-08-11: cash in this account.',
    ],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$40,600',
      run: () => ACC().inside?.find((x) => x.key === 'stocks_etf')?.value ?? null,
    },
    note: 'THE LAST NET WORTH FIGURE WITHOUT A WORKED EXAMPLE, given one 2026-09-30. Its two lines add to the account\u2019s own total \u2014 $6,000 of cash plus $40,600 of fund is the $46,600 the header shows \u2014 which is what makes the itemising checkable rather than asserted.',
  },
});
