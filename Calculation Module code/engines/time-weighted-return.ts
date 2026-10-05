// ENGINE — the time-weighted return. The ONE way the app works out a return.
//
// OWNER DECISION, 2026-10-04 (DEC-1669): "All return should be True Weighted Return and not Dietz
// return." Not a Modified Dietz return, not a money-weighted return, and not a change in balance.
//
// WHAT IT IS. Split the period every time money moves in or out. For each piece, divide the value
// just before the next movement by the value just after the last one. Multiply the pieces and take
// 1 off. Money added is never counted as earned, however large it is and whenever it arrived.
//
// WHAT THE RECORD HOLDS, and it decides the arithmetic: ONE value a day per account, taken AFTER
// that day's money has moved. So the value just before a movement is that day's value less the
// movement — and a movement on a day with no recorded value cannot be measured across at all.
//
// IT REFUSES RATHER THAN GUESS. No figure when:
//   · no day at or before the start holds every account being measured;
//   · money moved on a day the record holds no value for;
//   · shares were moved in or out (the record does not say what they were worth that day);
//   · the value on a day is less than the money added that day (the record contradicts itself).
// It never falls back to another method. "No answer" is the honest answer.
//
// THREE RULES THAT COME FROM THE RECORD, each written where it is applied below:
//   1. AN ACCOUNT THAT JOINS THE RECORD inside the period arrives as money in, at its first recorded
//      value — it was not being measured before, so nothing it was already worth is "earned".
//   2. A DAY THAT IS MISSING AN ACCOUNT IS NOT USED. A rebuilt day holds linked accounts only; a
//      hand-entered account with holdings has no value that day, so the day cannot speak for the
//      total. A typed balance or a cash balance has no price, so its last recorded value stands
//      until the next one — that is what the record says, not an estimate.
//   3. CASH EARNS ONLY INTEREST. Every other change in a cash balance is money moving, so it is
//      counted as money in or out on the day the record first shows it — never as a gain or a loss.
import { accountValuesOn, type SnapshotDay } from './snapshots';

/** One dated amount on one measured account. Signed: plus is money in, minus is money out. */
export interface DatedAmount { date: string; accountId: string; amount: number }

export interface TimeWeightedInput {
  /** The daily record, with today's day in it. */
  days: SnapshotDay[];
  /** The accounts being measured. */
  accountIds: Set<string>;
  /** Those of them that are cash accounts (rule 3). */
  cashIds?: Set<string>;
  /** Deposits (+) and withdrawals (−) on the measured accounts that are not cash. */
  flows: DatedAmount[];
  /** Interest credited to a cash account — the one change in cash that is earned. */
  interest?: DatedAmount[];
  /** Days on which shares were moved in or out of a measured account. */
  sharesMoved?: string[];
  /** The day whose close is the beginning, and the last day. */
  start: string;
  end: string;
}

export type TimeWeightedRefusal =
  | 'START_NOT_RECORDED' | 'END_NOT_RECORDED' | 'MOVEMENT_HAS_NO_DATE' | 'MOVEMENT_DAY_NOT_RECORDED'
  | 'SHARES_MOVED' | 'VALUE_BELOW_MONEY_ADDED' | 'NOTHING_INVESTED';

export interface TimeWeightedVerdict {
  /** The return as a share (0.1097 = 10.97%), at full precision — or null when it is refused. */
  rate: number | null;
  refused?: TimeWeightedRefusal;
  /** The day a refusal is about, where it is about one. */
  day?: string;
  /** The day the measured period really starts: the recorded day at or before the start, or the
   *  first day there was money when it started with none. Null when refused. */
  measuredFrom: string | null;
}

/** Whether a value is a calendar day written as year-month-day. */
/* ─ MK-ST-F-080 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isDay
 *
 * Answers ..... Whether a value is a calendar day written as year-month-day.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-ST-F-081 timeWeightedReturn
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *               MK-NW-O-008 thePerformance · MK-ST-F-081 timeWeightedReturn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in s a m e of 0.5%.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-080
 * Changed ..... not in git yet (—)
 */
const isDay = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
/** Half a cent: two money figures closer than this are the same figure. */
const SAME = 0.005;

/** The time-weighted return of a set of accounts between two days, or the reason it cannot be measured. */
/* ─ MK-ST-F-081 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * timeWeightedReturn
 *
 * Answers ..... The time-weighted return of a set of accounts between two days, or the reason it cannot be measured.
 *
 * Formula .....
 *     ids = account ids
 *     cash = cash ids (or new set<string>() when missing)
 *     refuse = (refused: time weighted refusal, day?: string): time weighted verdict => ({ rate: nothing, refused, day, measured from: nothing })
 *     days = days (or none when missing) where is day(date) and date ≤ end.sort((x, y) => date.locale compare(date))
 *     line = new map<string, map<string, number>>()
 *     holds = new set<string>()
 *     span = new map<string, { first: string; last: string }>()
 *     values = new map<string, number>()
 *     s = span.get(id)!
 *     v = rows.get(date)
 *     nothing   when v = nothing
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in total of 0.
 *     · Uses a built-in growth of 1.
 *     · Uses a built-in money in of 0.
 *     · Never lets before fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-081
 * Changed ..... not in git yet (—)
 */
export function timeWeightedReturn(a: TimeWeightedInput): TimeWeightedVerdict {
  const ids = a.accountIds;
  const cash = a.cashIds ?? new Set<string>();
  const refuse = (refused: TimeWeightedRefusal, day?: string): TimeWeightedVerdict => ({ rate: null, refused, day, measuredFrom: null });

  // each account's own line through the record: the days it has a row on, and its value that day
  const days = (a.days ?? []).filter((d) => isDay(d.date) && d.date <= a.end).sort((x, y) => x.date.localeCompare(y.date));
  const line = new Map<string, Map<string, number>>();
  const holds = new Set<string>();                     // accounts that ever hold a priced security
  for (const d of days) {
    for (const h of d.holdings ?? []) if (ids.has(h.accountId)) holds.add(h.accountId);
    for (const [id, value] of accountValuesOn(d, (x) => ids.has(x))) { if (!line.has(id)) line.set(id, new Map()); line.get(id)!.set(d.date, value); }
  }
  const span = new Map<string, { first: string; last: string }>();
  for (const [id, rows] of line) { const k = [...rows.keys()]; span.set(id, { first: k[0], last: k[k.length - 1] }); }

  /** Every measured account's value on a recorded day — or null when one of them has none (rule 2). */
  const poolOn = (date: string): { date: string; values: Map<string, number>; total: number } | null => {
    const values = new Map<string, number>();
    for (const [id, rows] of line) {
      const s = span.get(id)!;
      if (date < s.first || date > s.last) continue;   // not in the record that day: not a member
      let v = rows.get(date);
      if (v == null && !holds.has(id)) {               // a typed or cash balance stands until the next one
        for (const [d, value] of rows) { if (d < date) v = value; else break; }
      }
      if (v == null) return null;
      values.set(id, v);
    }
    let total = 0; for (const v of values.values()) total += v;
    return { date, values, total };
  };

  // the beginning: the latest day at or before the start that holds every account then measured
  let begin: ReturnType<typeof poolOn> = null;
  for (const d of days) { if (d.date > a.start) break; const p = poolOn(d.date); if (p && p.values.size > 0) begin = p; }
  if (!begin) return refuse('START_NOT_RECORDED');
  const end = days.some((d) => d.date === a.end) ? poolOn(a.end) : null;
  if (!end) return refuse('END_NOT_RECORDED');

  // money that cannot be placed on a day cannot be measured across
  for (const f of a.flows ?? []) if (ids.has(f.accountId) && !cash.has(f.accountId) && !isDay(f.date)) return refuse('MOVEMENT_HAS_NO_DATE');
  const moved = (a.sharesMoved ?? []).filter((d) => d > begin!.date && d <= a.end).sort()[0];
  if (moved) return refuse('SHARES_MOVED', moved);

  let prev = begin;
  let growth = 1;
  let measuredFrom: string | null = null;
  for (const d of days) {
    if (d.date <= begin.date) continue;
    const now = poolOn(d.date);
    if (!now) continue;                                // rule 2: a day missing an account is not used
    let moneyIn = 0;
    for (const id of new Set([...prev.values.keys(), ...now.values.keys()])) {
      const was = prev.values.get(id), is = now.values.get(id);
      if (was == null) { moneyIn += is as number; continue; }          // rule 1: it joined the record
      if (is == null) { moneyIn -= was; continue; }                     // it left: its last value went
      if (cash.has(id)) {                                               // rule 3: cash earns only interest
        const earned = (a.interest ?? []).filter((x) => x.accountId === id && x.date > prev.date && x.date <= now.date).reduce((t, x) => t + x.amount, 0);
        moneyIn += (is - was) - earned;
        continue;
      }
      for (const f of a.flows ?? []) {
        if (f.accountId !== id || !(f.date > prev.date && f.date <= now.date)) continue;
        if (f.date !== now.date) return refuse('MOVEMENT_DAY_NOT_RECORDED', f.date);
        moneyIn += f.amount;
      }
    }
    const before = now.total - moneyIn;                // the value just before that day's money moved
    if (prev.total > SAME) {
      if (before < -SAME) return refuse('VALUE_BELOW_MONEY_ADDED', now.date);
      growth *= Math.max(0, before) / prev.total;
      measuredFrom = measuredFrom ?? prev.date;
    } else if (Math.abs(before) > SAME) {
      // value with nothing behind it and no money recorded as arriving: the record contradicts itself
      return refuse('VALUE_BELOW_MONEY_ADDED', now.date);
    }
    // a piece that starts with nothing measures nothing: the period starts at the first money in
    prev = now;
  }
  if (measuredFrom == null) return refuse('NOTHING_INVESTED');
  return { rate: growth - 1, measuredFrom };
}

/** Which of a household's records are money moving in or out of the measured accounts, which are interest, and on which days shares were moved. */
/* ─ MK-ST-F-082 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * movementsOf
 *
 * Answers ..... Which of a household's records are money moving in or out of the measured accounts, which are interest, and on which days shares were moved.
 *
 * Formula .....
 *     flows = [], interest: dated amount[] = [], shares moved: string[] = []
 *     date = the first 10 of string(date ?? '')
 *     acc = string(account id)   if account id ≠ nothing
 *     ''   otherwise
 *     other = string(counter account id)   if counter account id ≠ nothing
 *     ''   otherwise
 *     amount = amount read as a number (or 0 when missing or zero)
 *     the answer = { flows, interest, shares moved }
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-100 TREND · MK-NW-O-003 theNetWorth
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-082
 * Changed ..... not in git yet (—)
 */
export function movementsOf(transactions: any[], ids: Set<string>): { flows: DatedAmount[]; interest: DatedAmount[]; sharesMoved: string[] } {
  const flows: DatedAmount[] = [], interest: DatedAmount[] = [], sharesMoved: string[] = [];
  for (const t of transactions ?? []) {
    const date = String(t?.date ?? '').slice(0, 10);
    const acc = t?.account_id != null ? String(t.account_id) : '';
    const other = t?.counter_account_id != null ? String(t.counter_account_id) : '';
    const amount = Number(t?.amount) || 0;
    switch (t?.type) {
      case 'DEPOSIT': if (ids.has(acc)) flows.push({ date, accountId: acc, amount }); break;
      case 'WITHDRAWAL': if (ids.has(acc)) flows.push({ date, accountId: acc, amount: -amount }); break;
      // cash between accounts: it leaves the first and arrives in the second, the way the balances are kept
      case 'TRANSFER':
        if (ids.has(acc)) flows.push({ date, accountId: acc, amount: -amount });
        if (ids.has(other)) flows.push({ date, accountId: other, amount });
        break;
      // shares between accounts: inside the measured set nothing arrived or left; across its edge the
      // record does not say what they were worth, so the day is named and the return refuses there
      case 'TRANSFER_IN_KIND':
        if (ids.has(acc) !== ids.has(other)) sharesMoved.push(date);
        break;
      case 'INTEREST':
        if (ids.has(acc) && !t.reinvested) interest.push({ date, accountId: acc, amount });
        break;
      default: break;
    }
  }
  return { flows, interest, sharesMoved };
}
