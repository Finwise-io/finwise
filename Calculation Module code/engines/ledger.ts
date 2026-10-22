// ENGINE — turning one institution row into one ledger row.
//
// This is the bridge the app crosses. The engines above decide WHAT an event is and WHICH WAY the
// money went; this decides what gets written down, and it is where the two old defects were.
//
// It keeps the app's existing row shape so nothing downstream has to change at once, and adds two
// fields that carry the new truth:
//   · `event`     — the canonical event, so a screen never has to re-derive it from a type name
//   · `signed`    — the amount WITH its direction, so no sum has to guess
//
// THE UNCLASSIFIED RULE. A row we cannot name is written down with type 'ADJUSTMENT', which the
// app's own comment already defines as "a visible history row — touches NOTHING". That is exactly
// the behaviour an unknown word needs, and it means an unrecognised broker word can never again
// reach contributions the way it did on the founder's account.
import { classifyEvent, EVENTS, type CanonicalEvent } from './events';
import { readMoney, signed, type SignConvention, type Money } from './money';
import { Dec } from './decimal';
import { round2 } from './money';

/** The app's existing transaction vocabulary, kept so screens keep working during the migration. */
export type LegacyTxnType =
  | 'OPENING_POSITION' | 'OPENING_CASH' | 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL'
  | 'TRANSFER' | 'TRANSFER_IN_KIND' | 'DIVIDEND' | 'INTEREST' | 'COUPON' | 'FEE' | 'ADJUSTMENT';

/** Canonical event → the app's existing type. ADJUSTMENT is the honest home for anything that must
 *  be visible but must touch no total: unknown words, sweeps, internal journals, expiries. */
const TO_LEGACY: Record<CanonicalEvent, LegacyTxnType> = {
  CASH_IN: 'DEPOSIT',
  CASH_OUT: 'WITHDRAWAL',
  SECURITIES_IN: 'TRANSFER_IN_KIND',
  SECURITIES_OUT: 'TRANSFER_IN_KIND',
  BUY: 'BUY',
  SELL: 'SELL',
  DIVIDEND: 'DIVIDEND',
  CAPITAL_GAIN_DISTRIBUTION: 'DIVIDEND',
  INTEREST: 'INTEREST',
  REINVEST_PURCHASE: 'BUY',          // it IS a purchase; the income was booked on its own row
  RETURN_OF_CAPITAL: 'SELL',         // your own principal coming back, never new money
  SWEEP: 'ADJUSTMENT',               // visible, touches nothing
  INTERNAL_TRANSFER: 'TRANSFER',
  FEE: 'FEE',
  TAX_WITHHELD: 'FEE',
  MARGIN_INTEREST: 'FEE',
  CORPORATE_ACTION: 'ADJUSTMENT',
  OPTION_EXERCISE: 'ADJUSTMENT',
  OPTION_EXPIRY: 'ADJUSTMENT',
  UNKNOWN: 'ADJUSTMENT',             // THE RULE: kept, shown, counted nowhere
};

export interface RawActivity {
  word: string | null | undefined;      // the institution's own word for the event
  amount: number | string | null | undefined;
  units?: number | string | null;
  price?: number | string | null;
  date?: string | null;
  ticker?: string | null;
  description?: string | null;
  /** True when the row is an OPTION trade. Some brokers say so in a separate field rather than in
   *  the word, and the distinction is worth keeping on the row: an option's units are CONTRACTS. */
  isOption?: boolean;
}

/** A short phrase saying what this row is, in words a person reads. Kept because these sentences do
 *  real work on screen — "redeemed at maturity" is how someone understands why money appeared
 *  without them paying anything in. */
const PLAIN_NOTE: Partial<Record<CanonicalEvent, string>> = {
  RETURN_OF_CAPITAL: 'redeemed at maturity',
  SWEEP: 'moved between this account\'s cash and its money-market fund — nothing entered or left',
  INTERNAL_TRANSFER: 'moved between your own accounts',
  REINVEST_PURCHASE: 'dividend reinvested — bought more shares',
  CORPORATE_ACTION: 'a change to the shares themselves, not to your money',
  OPTION_EXPIRY: 'option expired',
  OPTION_EXERCISE: 'option exercised',
  MARGIN_INTEREST: 'interest charged on margin',
  TAX_WITHHELD: 'tax withheld',
};

export interface LedgerRow {
  type: LegacyTxnType;
  /** The canonical event — the field new code should read. */
  event: CanonicalEvent;
  /** Size only, EXACT, matching the app's existing positive-amount convention. */
  amount: Dec;
  /** The amount WITH direction: IN positive, OUT negative — EXACT. Sums use this. */
  signedAmount: Dec;
  direction: Money['direction'];
  shares?: number;
  price?: number;
  date?: string;
  ticker?: string;
  reinvested?: boolean;
  /** The institution's own word, always kept — so an unknown can be shown and chased. */
  sourceWord: string;
  /** True when this row carries no money and no unit change — a marker the caller may drop. */
  isEmptyMarker: boolean;
  recognised: boolean;
  note?: string;
}

/**
 * Read one institution row into one ledger row.
 *
 * A CASH-SETTLED option exercise is the one case where a row we would otherwise treat as a marker
 * carries real money. The founder challenged this directly: "option could expire in the money".
 * So the rule here is: a skipped-type row with a non-zero amount keeps its money and stays visible.
 */
/* ─ MK-ST-F-012 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * toLedgerRow
 *
 * Answers ..... Read one institution row into one ledger row.
 *
 * Formula .....
 *     c = classify event(raw.word)
 *     money = read money(raw.amount, convention, rule.direction)
 *     units = number or undefined(raw.units)
 *     legacy = TO_LEGACY[event]
 *     is trade = legacy = 'BUY' (or legacy = 'SELL' when missing or zero)
 *
 * Called by ... MK-XS-F-102 ingestSync · MK-XS-F-188 fixStoredFees
 *
 * Reaches ..... 55 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-XS-F-188 fixStoredFees · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               … and 37 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-012
 * Changed ..... 2026-08-18 (d299744)
 */
export function toLedgerRow(raw: RawActivity, convention: SignConvention): LedgerRow {
  const c = classifyEvent(raw.word);
  const money = readMoney(raw.amount, convention, c.rule.direction);
  const units = numberOrUndefined(raw.units);
  // Price normalisation must follow the LEDGER type, not the canonical event, because the
  // first-in-first-out matching downstream keys on buys and sells. A maturity payout is a SELL to
  // the ledger even though its canonical name is RETURN_OF_CAPITAL, and without a price it drops
  // out of realised-gain matching entirely — caught by the bond test, which went to zero.
  const legacy = TO_LEGACY[c.event];
  const isTrade = legacy === 'BUY' || legacy === 'SELL';

  // On a trade the broker's own cash figure is the truth; normalise price so shares × price equals
  // it exactly. This one rule covers options priced per contract and bonds priced per $100 of face.
  //
  // PRICE IS NOT MONEY AND MUST NOT BE ROUNDED TO CENTS. Caught by this engine's own test: a
  // Treasury bill bought for $224,454.11 against 227,000 of face works out at $0.9888 per unit of
  // face. Rounded to $0.99 and multiplied back, it comes to $224,730 — $276 of invented gain on one
  // row. Money rounds to the cent because money IS cents; a price is a ratio and keeps its precision.
  const price = isTrade && !money.amount.isZero() && units
    ? money.amount.divRound(Dec.of(String(Math.abs(units)))).toNumber(8)
    : numberOrUndefined(raw.price);

  const optionWord = raw.isOption
    ? (c.event === 'BUY' ? 'option purchase' : c.event === 'SELL' ? 'option sale' : undefined)
    : undefined;

  return {
    type: TO_LEGACY[c.event],
    event: c.event,
    amount: money.amount,
    signedAmount: signed(money),
    direction: money.direction,
    shares: units != null ? Math.abs(units) : undefined,
    price,
    date: raw.date ? String(raw.date).slice(0, 10) : undefined,
    ticker: raw.ticker ? String(raw.ticker).toUpperCase() : undefined,
    reinvested: c.event === 'REINVEST_PURCHASE' ? true : undefined,
    sourceWord: c.word,
    recognised: c.recognised,
    // A zero-amount, zero-unit marker carries nothing. The caller decides whether to keep it; what
    // matters is that a row carrying MONEY is never silently dropped, which was the founder's
    // option challenge — a cash-settled exercise has its proceeds on this very row.
    isEmptyMarker: money.amount.isZero() && !units &&
      (c.event === 'OPTION_EXPIRY' || c.event === 'OPTION_EXERCISE'),
    note: c.recognised
      ? [optionWord ?? PLAIN_NOTE[c.event], raw.description].filter(Boolean).join(' · ') || undefined
      : `We could not classify "${c.word}" — this row is shown but counted in no total.`,
  };
}

/** Which rows a given total may read. The ONLY place a screen should ask. */
// ── PERSONAL FLOWS — the stored ledger summed through ONE table (Track 1 step 3) ───────────────
// Screens used to re-derive these inline with Math.abs on every amount, which is the $2,387 class
// again: a reversal ADDS instead of cancelling. This is the single place the app's stored rows
// (legacy TxnType vocabulary) become walk totals — exact decimals, signs respected, and any type
// not in the table counts in NOTHING (the UNKNOWN rule, applied to the store).
const STORED_TYPE_BUCKET: Record<string, 'contributions' | 'withdrawals' | 'dividends' | 'interest' | 'fees' | 'debtPrincipal' | 'none'> = {
  DEPOSIT: 'contributions',
  WITHDRAWAL: 'withdrawals',
  DIVIDEND: 'dividends',           // reinvested or cash — income earned counts ONCE either way
  INTEREST: 'interest',
  COUPON: 'interest',
  FEE: 'fees',
  DEBT_PAYMENT: 'debtPrincipal',
  // internal moves, baseline captures and markers reach no flow total, by design:
  BUY: 'none', SELL: 'none', TRANSFER: 'none', TRANSFER_IN_KIND: 'none',
  OPENING_POSITION: 'none', OPENING_CASH: 'none', ADJUSTMENT: 'none',
};

// ── THE ONE RULE FOR A SIGNED AMOUNT ON A STORED RECORD (2026-10-21) ───────────────────────────────────────────────
// A stored record holds a size, a kind and — where the broker's sign said which way the money went — a direction: IN,
// it arrived in this account; OUT, it left. The sync writes it on a share transfer (2026-10-04), on a one-sided cash
// journal (2026-10-20) and on a deposit or a withdrawal (2026-10-21), so a broker's −$500 "deposit" — a reversal — is
// kept as $500 that LEFT. Before 2026-10-21 the sync wrote that reversal as a plain $500 deposit, and the return, the
// walk and the activity list all counted $500 arriving. Every reader of a stored amount asks here: the return
// (movementsOf), the walk (personalFlowTotals), the activity list (cashEffect) and the rebuilt record (rebuild-history).
/** Which way each kind of record moves money when it says nothing else: +1 into its account, −1 out of it. A transfer
 *  leaves the account it is written on; the account it names as the other side gains it. */
const WAY_OF_KIND: Record<string, 1 | -1> = {
  DEPOSIT: 1, SELL: 1, DIVIDEND: 1, INTEREST: 1, COUPON: 1,
  WITHDRAWAL: -1, BUY: -1, FEE: -1, DEBT_PAYMENT: -1, TRANSFER: -1,
};
/** The kinds whose money IS their amount. A trade's money is its shares × price and a share transfer's is what the
 *  shares were worth, so a missing amount on those is not a missing figure. */
const AMOUNT_IS_THE_MONEY = new Set(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'DIVIDEND', 'INTEREST', 'COUPON', 'FEE']);
export interface StoredMoneyRow { type?: string | null; amount?: unknown; direction?: string | null }
/** How a stored amount is read: the way it moves money, and whether the stored figure is a size (the record says which
 *  way) or keeps the sign it was stored with (a typed −$500 deposit has always read as a reversal). */
/* ─ MK-ST-F-087 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * readingOf
 *
 * Answers ..... How a stored amount is read: the way it moves money, and whether the stored figure is a size (the record says which way) or keeps the sign it was stored with (a typed −$500 deposit has always read as a reversal).
 *
 * Formula .....
 *     sign = 1   if direction = 'IN'
 *     -1   otherwise
 *     size = true   when direction = 'IN' (or direction = 'OUT' when missing or zero)
 *     sign = WAY_OF_KIND[string(type ?? '')] (or 1 when missing)
 *     size = false
 *
 * Called by ... MK-ST-F-013 personalFlowTotals · MK-ST-F-088 moneyIntoAccount
 *
 * Reaches ..... 93 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-202 TAX
 *               MK-ST-F-089 amountNotOnRecord · MK-CF-F-210 annualOfSource
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-PF-F-048 bondInterestInWindow · MK-CF-F-013 budgetFromOnboarding
 *               … and 75 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-087
 * Changed ..... not in git yet (—)
 */
function readingOf(t: StoredMoneyRow): { sign: 1 | -1; size: boolean } {
  if (t?.direction === 'IN' || t?.direction === 'OUT') return { sign: t.direction === 'IN' ? 1 : -1, size: true };
  return { sign: WAY_OF_KIND[String(t?.type ?? '')] ?? 1, size: false };
}
/** THE MONEY A STORED RECORD MOVED INTO ITS ACCOUNT — plus is money in, minus is money out. Null when its amount is not
 *  on record (DEC-3523 tenet 3: unknown is not zero), or when the record names no direction and its kind moves no
 *  money of its own. Example: a broker's −$500 deposit, stored as $500 with direction OUT, is −500. */
/* ─ MK-ST-F-088 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * moneyIntoAccount
 *
 * Answers ..... THE MONEY A STORED RECORD MOVED INTO ITS ACCOUNT — plus is money in, minus is money out.
 *
 * Formula .....
 *     raw = amount
 *     nothing   when raw = nothing (or raw = '' when missing or zero)
 *     n = raw read as a number
 *     nothing   when !number.is finite(n)
 *     nothing   when direction ! = 'IN' and direction ! = 'OUT' and WAY_OF_KIND[string(type ?? '')] = nothing
 *     r = reading of(t)
 *     the answer = sign × (size ? math.abs(n) : n)
 *
 * Called by ... MK-CF-F-108 isMoneyOut · MK-CF-F-111 applyTransaction
 *               MK-CF-F-116 inverseOf · MK-CF-F-118 cashEffect
 *               MK-CF-F-119 investmentIncomeAnnual · MK-CF-F-183 paidOutByAccount
 *               MK-NW-F-084 categoryEarnings · MK-NW-O-002 theAccount
 *               MK-NW-O-006 theHolding · MK-PF-F-048 bondInterestInWindow
 *               MK-PL-F-009 rmdTakenThisYear · MK-ST-F-013 personalFlowTotals
 *               MK-ST-F-072 undo · MK-ST-F-082 movementsOf
 *               MK-ST-F-089 amountNotOnRecord · MK-XS-F-011 buildChangeWalk
 *               MK-XS-F-102 ingestSync
 *
 * Reaches ..... 92 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-082 NW · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-202 TAX
 *               MK-ST-F-089 amountNotOnRecord · MK-CF-F-210 annualOfSource
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-PF-F-048 bondInterestInWindow · MK-CF-F-013 budgetFromOnboarding
 *               … and 74 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-088
 * Changed ..... not in git yet (—)
 */
export function moneyIntoAccount(t: StoredMoneyRow): number | null {
  const raw = t?.amount;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (t?.direction !== 'IN' && t?.direction !== 'OUT' && WAY_OF_KIND[String(t?.type ?? '')] == null) return null;
  const r = readingOf(t);
  return r.sign * (r.size ? Math.abs(n) : n);
}
/** A deposit, withdrawal, transfer, dividend, interest, coupon or fee whose amount is not on record. Its money is
 *  unknown, never $0 (DEC-3523 tenet 3): the activity list shows a dash and the return refuses across its day. */
/* ─ MK-ST-F-089 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * amountNotOnRecord
 *
 * Answers ..... A deposit, withdrawal, transfer, dividend, interest, coupon or fee whose amount is not on record.
 *
 * Formula .....
 *     AMOUNT_IS_THE_MONEY.has(string(type ?? '')) and money into account(t) = nothing
 *
 * Called by ... MK-NW-O-002 theAccount
 *
 * Reaches ..... 59 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-118 cashEffect · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-XS-F-188 fixStoredFees · MK-CF-F-041 getDebtState
 *               … and 41 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-089
 * Changed ..... not in git yet (—)
 */
export function amountNotOnRecord(t: StoredMoneyRow): boolean {
  return AMOUNT_IS_THE_MONEY.has(String(t?.type ?? '')) && moneyIntoAccount(t) == null;
}

export interface StoredFlowRow { type?: string | null; amount?: number | string | null; direction?: string | null }
export interface PersonalFlowTotals {
  contributions: Dec; withdrawals: Dec; dividends: Dec; interest: Dec; fees: Dec; debtPrincipal: Dec;
}
/* ─ MK-ST-F-013 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * personalFlowTotals
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     bucket = STORED_TYPE_BUCKET[string(type ?? '')] (or 'none' when missing)
 *     d = dec.parse(amount)
 *     way = reading of(r)
 *     into = abs()   if way.sign = 1
 *     abs().neg()   otherwise   if way.size
 *     d   if way.sign = 1
 *     neg()   otherwise   otherwise
 *     the answer = t
 *
 * Called by ... MK-NW-O-002 theAccount · MK-NW-O-008 thePerformance
 *               MK-ST-F-012 toLedgerRow
 *
 * Reaches ..... 65 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-118 cashEffect
 *               … and 47 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-013
 * Changed ..... 2026-08-20 (c3e2601)
 */
export function personalFlowTotals(rows: StoredFlowRow[]): PersonalFlowTotals {
  const t: PersonalFlowTotals = {
    contributions: Dec.ZERO, withdrawals: Dec.ZERO, dividends: Dec.ZERO,
    interest: Dec.ZERO, fees: Dec.ZERO, debtPrincipal: Dec.ZERO,
  };
  for (const r of rows ?? []) {
    const bucket = STORED_TYPE_BUCKET[String(r.type ?? '')] ?? 'none';
    if (bucket === 'none') continue;
    const d = Dec.parse(r.amount);
    if (d == null) continue;                      // no amount is NOTHING, never zero-with-meaning
    // read the one way (moneyIntoAccount, 2026-10-21), then put on its kind's own side: a deposit that went OUT is a
    // reversal and lowers what was put in; a record with no direction keeps the sign it was stored with
    const way = readingOf(r);
    const into = way.size ? (way.sign === 1 ? d.abs() : d.abs().neg()) : (way.sign === 1 ? d : d.neg());
    t[bucket] = t[bucket].add((WAY_OF_KIND[String(r.type ?? '')] ?? 1) === 1 ? into : into.neg());   // signed: a stored reversal cancels, never adds
  }
  return t;
}

// ── THE IMPORT KEY — one identity per imported row, owned here, shared by every road ───────────
// (Track 1 step 2, founder brief 2026-08-20 §F.) Re-importing an overlapping window can never
// double money: a row's identity is the composite of everything that makes it THAT row — never the
// source's own id. SnapTrade reprocesses history and its ids churn; a downloaded file carries no
// ids at all. The description separates two otherwise-identical same-day fills — the one field
// that differs. Every road (SnapTrade today, the QFX/CSV import door next) maps its own fields
// into this ONE mechanism; no road invents a second identity (rule R8: one mechanism per shape).
export interface ImportIdentity {
  account: string;                       // OUR account id — the same dividend in two accounts is two rows
  date?: string | null;
  word?: string | null;                  // the institution's own word for the event
  amount?: number | string | null;
  units?: number | string | null;
  security?: string | null;              // the road's most stable security identifier
  ref?: string | null;                   // an external reference id, where the road carries one
  description?: string | null;
}
/* ─ MK-ST-F-014 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * importKey
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = account | date | WORD | amount | units | security | ref | description, joined with '|' (missing parts empty)
 *
 * Called by ... MK-XS-F-108 activityKey
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-108 activityKey · MK-XS-F-109 dedupeActivities
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-014
 * Changed ..... 2026-08-20 (157df51)
 */
export function importKey(id: ImportIdentity): string {
  return [
    id.account,
    id.date ?? '',
    (id.word ?? '').toUpperCase(),
    id.amount ?? '',
    id.units ?? '',
    id.security ?? '',
    id.ref ?? '',
    id.description ?? '',
  ].join('|');
}

/* ─ MK-ST-F-015 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowsFor
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     rows where EVENTS[event].totals.includes(total)
 *
 * Called by ... MK-ST-F-016 totalOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-ST-F-016 totalOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-015
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function rowsFor(
  rows: LedgerRow[],
  total: 'contributions' | 'withdrawals' | 'income' | 'costs',
): LedgerRow[] {
  return rows.filter((r) => EVENTS[r.event].totals.includes(total));
}

/** A total, summed SIGNED and EXACT — a reversal reduces its total instead of inflating it.
 *  (Audit item 36: the absolute-value sum here was the $2,387 class rebuilt; now the sign carries.) */
/* ─ MK-ST-F-016 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * totalOf
 *
 * Answers ..... A total, summed SIGNED and EXACT — a reversal reduces its total instead of inflating it.
 *
 * Formula .....
 *     dec.sum(rows for(rows, total).map((r) => signed amount))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-016
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function totalOf(rows: LedgerRow[], total: 'contributions' | 'withdrawals' | 'income' | 'costs'): Dec {
  return Dec.sum(rowsFor(rows, total).map((r) => r.signedAmount));
}

/** Everything we could not name, for the honest line on screen: "12 entries we could not classify". */
/* ─ MK-ST-F-017 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * unclassified
 *
 * Answers ..... Everything we could not name, for the honest line on screen: "12 entries we could not classify".
 *
 * Formula .....
 *     rows where recognised is missing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-017
 * Changed ..... 2026-08-18 (d299744)
 */
export function unclassified(rows: LedgerRow[]): LedgerRow[] {
  return rows.filter((r) => !r.recognised);
}

/** A stored record the app could not name: the institution's own word for it (empty when it sent none) and the
 *  amount it carries, unsigned, or null when it carries shares and no amount. */
export interface UnnamedActivity { word: string; amount: number | null }

/** AN ACTIVITY THE APP DOES NOT KNOW, READ BACK FROM THE STORE (2026-10-20, Q15 — the institution-word rule).
 *
 *  An unrecognised word is written down as ADJUSTMENT — kept, shown, counted in no total (THE UNCLASSIFIED RULE
 *  above). Counted in no total is right; SAID nowhere was not: the money still moved the broker's balance, so a return
 *  measured across that day read it as earned and nothing told the person. This is the one test of "the app could not
 *  name this record", so the return and the gap banner ask the same question. A record written since 2026-10-20
 *  carries the word in `unclassified_word`; one written before carries it only in its note, in the one wording the
 *  sync wrote ("broker word: …"). A record that carries no money and no shares can move no figure, so it is not one. */
/* ─ MK-ST-F-090 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unnamedActivityOf
 *
 * Answers ..... AN ACTIVITY THE APP DOES NOT KNOW, READ BACK FROM THE STORE (2026-10-20, Q15 — the institution-word rule).
 *
 * Formula .....
 *     nothing   when t is missing (or type ! = 'ADJUSTMENT' when missing or zero)
 *     from note = ÷ broker word: (. × )$ ÷ .exec(string(note ?? ''))
 *     nothing   when unclassified word = nothing and !from note
 *     word = string(unclassified word ?? from note.[1] ?? '').trim()
 *     amount = amount read as a number
 *     has amount = amount ≠ nothing and amount ! = '' and number.is finite(amount) and amount ! = 0
 *     shares = shares read as a number
 *     has shares = shares ≠ nothing and number.is finite(shares) and shares ! = 0
 *     nothing   when !has amount and !has shares
 *     the answer:
 *     word = word
 *     amount = size of(amount)   if has amount
 *     nothing   otherwise
 *
 * Called by ... MK-NW-O-002 theAccount · MK-ST-F-082 movementsOf
 *               MK-XS-F-002 dataGaps · MK-XS-F-102 ingestSync
 *
 * Reaches ..... 67 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-118 cashEffect
 *               … and 49 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-090
 * Changed ..... not in git yet (—)
 */
export function unnamedActivityOf(t: {
  type?: string | null; amount?: unknown; shares?: unknown; note?: string | null; unclassified_word?: string | null;
} | null | undefined): UnnamedActivity | null {
  if (!t || t.type !== 'ADJUSTMENT') return null;
  const fromNote = /broker word: (.*)$/.exec(String(t.note ?? ''));
  if (t.unclassified_word == null && !fromNote) return null;     // a sweep, a split, an expiry: the app named it
  const word = String(t.unclassified_word ?? fromNote?.[1] ?? '').trim();
  const amount = Number(t.amount);
  const hasAmount = t.amount != null && t.amount !== '' && Number.isFinite(amount) && amount !== 0;
  const shares = Number(t.shares);
  const hasShares = t.shares != null && Number.isFinite(shares) && shares !== 0;
  if (!hasAmount && !hasShares) return null;
  return { word, amount: hasAmount ? Math.abs(amount) : null };
}

/* ─ MK-ST-F-058 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * numberOrUndefined
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     n = v   if v is a number
 *     na n   if v = nothing
 *     parse float(string(v).replace( ÷ [$,\s] ÷ g, ''))   otherwise   otherwise
 *     the answer:
 *     n   if number.is finite(n)
 *     undefined   otherwise
 *
 * Called by ... MK-ST-F-012 toLedgerRow
 *
 * Reaches ..... 56 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-XS-F-188 fixStoredFees · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               … and 38 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-058
 * Changed ..... not in git yet (—)
 */
const numberOrUndefined = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : v == null ? NaN : parseFloat(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
/* ─ MK-ST-F-059 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * round8
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     round(n × 1e8) ÷ 1e8
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to 8 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-059
 * Changed ..... not in git yet (—)
 */
const round8 = (n: number) => Math.round(n * 1e8) / 1e8;
