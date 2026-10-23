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
import { cashEffect } from '../../../src/domain/transactions';
import type { AssetAccount } from '../../../src/domain/assets';
import { accountClassBreakdown, ASSET_CLASS_LABEL, uninvestedCashOf, unpricedValueOf } from '../../../src/domain/assets';
import { itemizedTotal, itemizeRemainder, itemizeMissingCount, type ItemHolding } from '../../../src/domain/assets/itemize';
import { personalFlowTotals, unnamedActivityOf, moneyIntoAccount, amountNotOnRecord } from '../../../Calculation Module code/engines/ledger';
import { Dec } from '../../../Calculation Module code/engines/decimal';   // exact money arithmetic for the income sum (incomeSumParts)
import { totalShares } from '../../../src/domain/performance';   // the one share count (listedShares)

export interface ClassSlice { key: string; label: string; value: number; }
export interface HoldingIncome { dividends: number; interest: number; words: string; }

export interface TheAccount {
  accountId: string;
  label: string;
  /** What the account is worth today — the ONE figure the band, the trio and the Total row all print. */
  marketValue: number;
  /** Dividends and interest this account has actually received. Never estimated, never back-filled. */
  income: number | null;   // null = no records yet, so no figure (MK-NW-M-019)
  /** What is inside it, by class. Null for an account that is not linked: there is nothing to read. */
  inside: ClassSlice[] | null;
  /** How many records the ledger holds for it. */
  activityCount: number;
  /** EACH RECORD, and what it moved. The screen worked the amount out itself from the ledger — a
   *  transfer coming IN counts as its own amount, anything else as its cash effect — which is a money
   *  figure calculated on a screen. The door answers it now (2026-10-01). */
  activity: { recordId: string; date: string; type: string; ticker: string | null;
              amount: number; mine: boolean;
              /** True where the record's money IS its amount (a deposit, withdrawal, transfer, dividend, interest, coupon
               *  or fee) and no amount is on record: the row shows a dash, never $0 (2026-10-21, DEC-3523 tenet 3). */
              noAmount: boolean;
              /** A record under a word the app does not know (Q15): the broker's word and the amount it sent, unsigned —
               *  null for every record the app does know. */
              unknown: { word: string; amount: number | null } | null }[];
  /** The income of one holding, by ticker — blank when the record does not say which holding paid. */
  incomeOfHolding: (ticker: string | null | undefined) => HoldingIncome;
  /** THE CASH IN THE ACCOUNT, ITS OWN INCOME (the account-page drawing v01, approved 2026-10-19): an interest record that
   *  names no holding is interest the account's cash paid ("Interest · cash in this account", and "Income: $15 interest"
   *  under the cash row). A dividend naming no holding still names none: it stays at the account level. */
  incomeOfCash: HoldingIncome;
  /** THE CASH ROW OF A LINKED ACCOUNT (2026-10-21, DEC-0095): the uninvested cash the broker reports plus the part of its
   *  total no listed holding accounts for — so the rows of BY CATEGORY & HOLDING add up to the market value. Broker total
   *  $50,000, holdings $40,000, cash reported $5,000 → $10,000. Null for an account built by hand (no rows are listed). */
  uninvestedCash: number | null;
  /** THE HOLDINGS WITH NO PRICE, AND WHAT THEY ARE WORTH (2026-10-21, tenets 2 and 3): the part of the broker's total the rest
   *  does not reach, filed under their class (Unclassified when they span classes) — the same figure Net worth counts for
   *  them. Their row prints it, never $0. Null when every holding is priced, or the total leaves nothing over for them. */
  unpriced: { value: number; cls: string; count: number } | null;
}

export interface Itemising {
  /** The lump being itemised — its total never moves while its inside is filled in. */
  keepTotalAt: number;
  itemised: number;
  remainder: number;
  /** False when a listed holding has no value: the remainder is not final, not 'unexplained'. */
  remainderFinal: boolean;
}

/** What is in this one account: what it is worth, what it holds, what each holding has paid, and its activity?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theAccount
 *
 * Answers ..... What is in this one account: what it is worth, what it holds, what each holding has paid, and its activity?
 *
 * Formula .....
 *     id = string(account.asset id)
 *     is income = (t: any) => type = 'DIVIDEND' (or type = 'INTEREST' (or type = 'COUPON' when missing or zero) when missing or zero)
 *     income = personal flow totals(ledger.filter(is income))
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
 *     cash interest = personal flow totals(ledger.filter((t) => type = 'INTEREST' and !string(ticker ?? '').trim())).interest.to number(2)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-118 cashEffect · MK-NW-F-075 ACC
 *
 * Reaches ..... 90 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-144 beforeTheRecordSentence · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 72 more — the full list is on functions_from_code
 *
 * Serves ...... MK-NW-M-019 · MK-NW-M-020 · MK-NW-M-021 · MK-NW-M-038
 *               MK-NW-M-039 · MK-NW-M-040 · MK-NW-M-062 · MK-NW-M-073
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-005 holding price
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0008 · DEC-0010 · DEC-0019 · DEC-0045 · DEC-0051 · DEC-0070
 *               DEC-0090 · DEC-0092 · DEC-0095 · DEC-0096 · DEC-0108 · DEC-0149
 *               DEC-0166 · DEC-0406 · DEC-0451
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
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
  // EVERY RECORD THAT TOUCHES THIS ACCOUNT — its own, and a transfer that ARRIVES in it. A transfer is
  // one record, kept on the account the money left; this list took only the account's own records, so
  // money that arrived by transfer was missing from the account it arrived in, and the line below
  // that prints such a row "at the amount moved" could never run (outside review, 2026-10-04).
  const id = String(account.asset_id);
  const ledger = (input.transactions ?? []).filter((t) => String(t.account_id) === id
    || ((t.type === 'TRANSFER' || t.type === 'TRANSFER_IN_KIND') && String(t.counter_account_id ?? '') === id));
  // a bond's COUPON is interest: the ledger books it so, and the bond's return counts it (DEC-6212, 2026-10-19)
  const isIncome = (t: any) => t.type === 'DIVIDEND' || t.type === 'INTEREST' || t.type === 'COUPON';
  const income = personalFlowTotals(ledger.filter(isIncome));

  // the same split Net worth counts by: a linked account's holdings, or the uninvested cash an account
  // built by hand records for itself with the rest under its class (Gemini, 2026-10-05: say what that
  // cash is before the account is itemised). A typed balance has no inside.
  const breakdown = accountClassBreakdown(account);
  const inside = breakdown
    ? (Object.keys(breakdown) as (keyof typeof breakdown)[])
        .filter((k) => breakdown[k] !== 0)
        .map((k) => ({ key: String(k), label: (ASSET_CLASS_LABEL as any)[k] ?? String(k), value: breakdown[k] }))
    : null;

  const incomeOfHolding = (ticker: string | null | undefined): HoldingIncome => {
    const tk = String(ticker ?? '').trim().toUpperCase();
    // a row with no ticker names no holding, so it belongs to none of them
    const rows = !tk ? [] : ledger.filter((t) => isIncome(t)
      && !!t.ticker && String(t.ticker).trim().toUpperCase() === tk);   // a broker's "VTI " is VTI
    const f = personalFlowTotals(rows);
    const dividends = f.dividends.toNumber(2);
    const interest = f.interest.toNumber(2);
    const parts: string[] = [];
    if (dividends > 0) parts.push(`${Math.round(dividends)} dividends`);
    if (interest > 0) parts.push(`${Math.round(interest)} interest`);
    return { dividends, interest, words: parts.join(' · ') };
  };
  // interest with no holding named is the cash's (account-page drawing v01, approved 2026-10-19)
  const cashInterest = personalFlowTotals(ledger.filter((t) => t.type === 'INTEREST' && !String(t.ticker ?? '').trim())).interest.toNumber(2);
  const incomeOfCash: HoldingIncome = { dividends: 0, interest: cashInterest, words: cashInterest > 0 ? `${Math.round(cashInterest)} interest` : '' };

  return {
    accountId: String(account.asset_id),
    label: account.label,
    marketValue: account.balance || 0,
    // NO RECORDS, NO FIGURE (MK-NW-M-019: "it says so instead of showing zero"). $0 is an answer; with
    // nothing recorded there is no answer yet.
    income: ledger.length === 0 ? null : income.dividends.add(income.interest).toNumber(2),
    inside,
    activity: ledger.map((t: any) => ({
      recordId: String(t.id ?? ''),
      date: String(t.date ?? ''),
      type: String(t.type ?? ''),
      ticker: t.ticker ?? null,
      // a transfer INTO this account is what left the other one; everything else is its effect on cash — both read by the
      // one rule for a stored amount (moneyIntoAccount, 2026-10-21), so a broker's −$500 deposit is −$500 here
      amount: (String(t.counter_account_id) === String(account.asset_id) && t.type === 'TRANSFER')
        ? 0 - (moneyIntoAccount(t) ?? 0) : cashEffect(t),
      mine: t.source !== 'connected',
      // AN AMOUNT NOT ON RECORD IS NOT $0 (2026-10-21, DEC-3523 tenet 3): interest the broker sent with no amount showed
      // $0 here while the return refused across its day. The row now shows a dash where the amount would be.
      noAmount: amountNotOnRecord(t),
      // A RECORD UNDER A WORD THE APP DOES NOT KNOW (Q15, the lead's decision, 2026-10-20; the account-page drawing's row
      // 50): counted in no total, so its effect above is 0 — but it is not $0. The broker's word and the amount it sent,
      // with no direction, are what the row shows (unnamedActivityOf, the one test the amber box and the return use).
      unknown: unnamedActivityOf(t),
    })),
    activityCount: ledger.length,
    incomeOfHolding,
    incomeOfCash,
    // the same split Net worth's Cash line counts (DEC-0095), so the page's cash row and that line cannot differ
    uninvestedCash: uninvestedCashOf(account),
    unpriced: ((u) => (u ? { value: u.value, cls: u.cls, count: ((account.positions ?? []) as any[]).filter((p) => p.last_price == null
      && listedShares(p) !== 0).length } : null))(unpricedValueOf(account)),
  };
}

// ── WHAT THE ACCOUNT PAGE CALCULATED ITSELF, MOVED HERE (2026-10-22; DEC-0346, screens compute nothing; the decisions check) ──
// The page added these up and compared them on screen. The numbers are the page's own, to the cent; only where they are
// calculated moved, so a test can hold them and the page prints what this module says.

/** IS THIS PART OF THE ACCOUNT THE WHOLE ACCOUNT, so its return IS the account's (2026-10-21; DEC-5068, tenet 4): worth the
 *  account's balance today, to the dollar, and nothing else in it worth anything when the window began — a known $0 is $0.
 *  Beta $1,200 beside Alpha $1,000 → $0 reads Beta's own +20.00%, never the account's −40.00%. */
/* ─ MK-NW-F-169 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isWholeAccountPart
 *
 * Answers ..... IS THIS PART OF THE ACCOUNT THE WHOLE ACCOUNT, so its return IS the account's (2026-10-21; DEC-5068, tenet 4): worth the account's balance today, to the dollar, and nothing else in it worth anything when the window began — a known $0 is $0.
 *
 * Formula .....
 *     false   when part value = nothing (or !number.is finite(part value) when missing or zero)
 *     round(part value) = math.round(account balance (or 0) and !(others at start when missing or zero) (or []).some((v) => (v ?? 0) > 0 when missing))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If v is missing it uses 0.
 *     · If account balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-169
 * Changed ..... not in git yet (—)
 */
export function isWholeAccountPart(partValue: number | null, accountBalance: number | null | undefined, othersAtStart: (number | null | undefined)[]): boolean {
  if (partValue == null || !Number.isFinite(partValue)) return false;   // a part whose value is not stated is not shown as the whole
  return Math.round(partValue) === Math.round(accountBalance || 0) && !(othersAtStart ?? []).some((v) => (v ?? 0) > 0);
}

/** THE PARTS OF THE INCOME SUM UNDER THE ACCOUNT PAGE'S TABLE (the drawing's row 12): each row's dividends + interest, in the
 *  order the rows run, added exactly in decimals; a row that earned nothing is left out; then the income no holding carries
 *  (a dividend that names no holding), so the parts always add up to the account's income (MK-NW-M-019). Nothing with no
 *  income. 1,500 ＋ 100 ＋ 85 ＋ 15 = $1,700. */
/* ─ MK-NW-F-170 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeSumParts
 *
 * Answers ..... THE PARTS OF THE INCOME SUM UNDER THE ACCOUNT PAGE'S TABLE (the drawing's row 12): each row's dividends + interest, in the order the rows run, added exactly in decimals; a row that earned nothing is left out; then the income no holding carries (a dividend that names no holding), so the parts always add up to the account's income (MK-NW-M-019).
 *
 * Formula .....
 *     parts = []
 *     parts   when account income = nothing (or not (account income > 0) when missing or zero)
 *     n = dec.of(inc.dividends or 0).add(dec.of(inc.interest or 0)).to string() read as a number
 *     rest = dec.of(account income).sub(dec.sum(parts.map((n) => dec.of(n))))
 *     the answer = parts
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If dividends is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If interest is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-170
 * Changed ..... not in git yet (—)
 */
export function incomeSumParts(rows: { dividends?: number | null; interest?: number | null }[], accountIncome: number | null | undefined): number[] {
  const parts: number[] = [];
  if (accountIncome == null || !(accountIncome > 0)) return parts;
  for (const inc of rows ?? []) {
    const n = Number(Dec.of(inc?.dividends || 0).add(Dec.of(inc?.interest || 0)).toString());
    if (n > 0) parts.push(n);
  }
  // the income no holding carries, subtracted EXACTLY, so a remainder that is really nothing reads nothing (DEC-0403)
  const rest = Dec.of(accountIncome).sub(Dec.sum(parts.map((n) => Dec.of(n))));
  if (!rest.isNeg() && !rest.isZero()) parts.push(Number(rest.toString()));
  return parts;
}

/** THE SHARES A HOLDING HOLDS — the count under a holding's name on the account page ("160 shares") and the test of whether a
 *  holding with no price holds anything. UNKNOWN WHEN ANY PURCHASE HAS NO SHARE COUNT ON RECORD (the lead's ruling of
 *  2026-10-22, tenet 3: unknown is not zero): the one count the Holding page reads (MK-PF-F-001 totalShares), so the two pages say
 *  one thing. It added such a purchase as 0, so 10 shares and a purchase with no count read "10 shares" here while the
 *  Holding page said the count is not on record. To reverse: count the unknown purchase as 0 again. */
/* ─ MK-NW-F-171 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * listedShares
 *
 * Answers ..... THE SHARES A HOLDING HOLDS — the count under a holding's name on the account page ("160 shares") and the test of whether a holding with no price holds anything.
 *
 * Formula .....
 *     total shares(position as any)
 *
 * Called by ... MK-NW-O-002 theAccount
 *
 * Reaches ..... 90 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-040 assetsFromOnboarding
 *               MK-NW-F-144 beforeTheRecordSentence · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               … and 72 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-171
 * Changed ..... not in git yet (—)
 */
export function listedShares(position: { lots?: { shares?: number | null }[] | null }): number | null {
  return totalShares(position as any);
}

/** ONE CLASS'S MARKET VALUE ON THE ACCOUNT PAGE: the values of its rows, added up — the figure on the class's band, which
 *  its rows beneath it add up to (tenet 2). Unknown when a row's value is not stated — a holding whose share count is not on
 *  record (2026-10-22, tenet 3) — so the band refuses as the row does, never a total that leaves it out. */
/* ─ MK-NW-F-172 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * classValueOf
 *
 * Answers ..... ONE CLASS'S MARKET VALUE ON THE ACCOUNT PAGE: the values of its rows, added up — the figure on the class's band, which its rows beneath it add up to (tenet 2).
 *
 * Formula .....
 *     nothing   when (rows ?? []).some((rw) => rw.count not stated)
 *     Σ over rows (or none when missing) of (value (or 0 when missing or zero))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-172
 * Changed ..... not in git yet (—)
 */
export function classValueOf(rows: { value?: number | null; countNotStated?: boolean }[]): number | null {
  if ((rows ?? []).some((rw) => rw?.countNotStated)) return null;
  return (rows ?? []).reduce((t, rw) => t + (rw?.value || 0), 0);
}

/** THE REST OF THE ACCOUNT BESIDE ONE CLASS (founder finding 2026-08-11: "this slice PLUS everything else IS the total"):
 *  the account's balance less that class's value. */
/* ─ MK-NW-F-173 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * restOfAccountBeside
 *
 * Answers ..... THE REST OF THE ACCOUNT BESIDE ONE CLASS (founder finding 2026-08-11: "this slice PLUS everything else IS the total"): the account's balance less that class's value.
 *
 * Formula .....
 *     (account balance or 0) − (class value or 0)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If account balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If class value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-173
 * Changed ..... not in git yet (—)
 */
export function restOfAccountBeside(accountBalance: number | null | undefined, classValue: number | null | undefined): number {
  return (accountBalance || 0) - (classValue || 0);
}

/** When an account entered as one total is broken into holdings: the total to keep, the value of the holdings listed so far, and the amount still not explained by them. */
/* ─ MK-NW-F-073 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * itemising
 *
 * Answers ..... When an account entered as one total is broken into holdings: the total to keep, the value of the holdings listed so far, and the amount still not explained by them.
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
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-073
 * Changed ..... not in git yet (—)
 */
export function itemising(lumpBalance: number, items: ItemHolding[]): Itemising {
  return {
    keepTotalAt: lumpBalance,
    itemised: itemizedTotal(items),
    remainder: itemizeRemainder(lumpBalance, items),
    // a listed holding with no value leaves the remainder NOT FINAL — never called unexplained (batch 06)
    remainderFinal: itemizeMissingCount(items) === 0,
  };
}

/** HOW MUCH OF THE TOTAL THE LISTED HOLDINGS FILL, from 0 to 1 — the Itemize screen's progress bar (2026-10-22; DEC-0346: the
 *  screen calculated it). Nothing to fill with no total; over-listed reads full. $30,000 listed of $50,000: 0.6. */
/* ─ MK-NW-F-178 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * itemisedShare
 *
 * Answers ..... HOW MUCH OF THE TOTAL THE LISTED HOLDINGS FILL, from 0 to 1 — the Itemize screen's progress bar (2026-10-22; DEC-0346: the screen calculated it).
 *
 * Formula .....
 *     max(0, min(1, itemised ÷ lump balance))   if lump balance > 0
 *     0   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-178
 * Changed ..... not in git yet (—)
 */
export function itemisedShare(itemised: number, lumpBalance: number): number {
  return lumpBalance > 0 ? Math.max(0, Math.min(1, itemised / lumpBalance)) : 0;
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
// a linked account's holding carries the broker's tag (ingest writes it) — without one it is Unclassified (DEC-2160)
const EXAMPLE_POSITION = { position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', label: 'Vanguard Total Market', unit: 'shares',
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

/** Example only: runs theAccount on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-075 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * ACC
 *
 * Answers ..... Example only: runs theAccount on the worked example and calculates nothing of its own.
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
 *               MK-XS-I-051 what an account actually returned over the last twelve months
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
    label: 'Market value', unit: 'money', screens: ['/account-detail', '/invest'], grain: 'one account',
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
  // ISSUED AND DECLARED 2026-10-01. The activity list said HOW MANY records there were and showed
  // each one's amount — but only the count had a name. The amounts are what a person actually reads
  // down the list, and they are what a mistyped deposit hides in.
  'MK-NW-M-062': {
    label: 'what one record moved', unit: 'money', screens: ['/account-detail', '/invest'], grain: 'one record',
    answers: 'What this one record added to the account or took out of it.',
    formula: 'the amount on the record, positive where it came in and negative where it went out',
    inputs: ['MK-NW-I-004 the activity records'],
    decisions: [
      'THE SIGN IS SHOWN AS A WORD OR A MARK, never by colour alone \u2014 a plus or a minus in front of '
      + 'the figure, so it reads the same to someone who cannot tell the two colours apart.',
      'A RECORD YOU TYPED AND ONE THE BROKER SENT BOTH APPEAR, each saying which it is (DEC-0107). A '
      + '$500 deposit mistyped as $5,000 is only findable if the row says where it came from.',
    ],
    refusal: 'No records yet \u2014 the section keeps its heading and says so.',
    ruled: '2026-10-01',
    // the first record in this example is a $420 dividend
    worked: { given: GIVEN, answer: '$420', run: () => ACC().activity[0].amount },
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
  // ISSUED AND DECLARED 2026-10-21 (Performance audit row 9, rule 11): the account page's HISTORIC 12-MONTH RETURN card printed
  // the rate you entered by hand (toFixed), with no identifier. It is a value you entered, shown back — as MK-NW-M-065 "What you
  // paid" is — so it is declared like one. Issued under rule 11 and Q49; `ruled` is the issue date, as MK-NW-M-065 and 066 were.
  // To reverse: delete this row and print toFixed again.
  'MK-NW-M-073': {
    label: 'Historic 12-month return', unit: 'percent-2dp', screens: ['/account-detail'], grain: 'one account',
    answers: 'What you entered as this account\u2019s return over the last twelve months \u2014 the rate the Retirement cockpit reads for it.',
    formula: 'the rate you entered on this account, shown back as entered (nothing computes it)',
    inputs: ['MK-XS-I-051 what an account actually returned over the last twelve months'],
    decisions: ['TWO DECIMALS, because it is a rate (Q49).',
      'NOT ENTERED IS NOT 0%: with nothing typed the card reads "Not entered" (DEC-6005\u2019s words).'],
    refusal: 'Not entered.',
    ruled: '2026-10-21',
    worked: { given: 'A brokerage account where you entered 2.1 as its historic 12-month return, in percent.', answer: '2.10%',
      run: () => ({ ...EXAMPLE_ACCOUNT, actual_ttm: 0.021 }).actual_ttm },
  },
});
