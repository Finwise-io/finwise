// Net worth and Performance · ONE IMPORTED HOLDINGS FILE, AS ROWS OF THE ONE MASTER RECORD (asset-record.ts).
//
// WHAT THIS DOES. The import already reads a file into an ImportResult (src/domain/import/holdingsImport.ts) and builds
// one account from it (importedAccountOf). This turns the same ImportResult into what the master record takes, in its
// calling order: (1) the events the file carries, through sortArriving; (2) per holding, the purchases the file lists,
// through purchasesFromList; (3) the file's values, through valueRows; and the facts of each bond or CD. The import is
// not changed: the cash, the holdings and their values are read from importedAccountOf and valueOnlyAccountsOf
// themselves, so the account and the record can never value one file two ways.
//
// THE RULES IT KEEPS, each held by a test beside this file:
//   1. THE DAY IS THE FILE'S OWN DATE ("Generated at Jun 21 2026"). Where the file states none, the day is blank and
//      the account holder is asked it (his ruling: a file with no date is asked). It is never the day of the import.
//   2. A HOLDING'S VALUE IS THE FILE'S OWN VALUE, as the account values it: an option at its contracts × 100 shares
//      (one QQQ put is $1,407.50, never $14.075); a bond or CD quoted per $100 of face at the value the file states.
//      A row with a value and no quantity counts toward the file's total, as the account's check against that total
//      counts it.
//   3. A PURCHASE KEEPS THE FILE'S OWN DATE AND COST. A date the file does not give is blank; a cost it does not give is
//      blank, never $0. A line is marked as the broker's average only where the file's cost column says "average".
//   4. A PURCHASE'S PRICE IS PER UNIT AS THE RECORD COUNTS UNITS, so shares × price is the dollars paid: an option is
//      counted in shares (its contracts × 100 shares a contract) at its cost per share, as a broker's option and a typed
//      one are (comparison check, 2026-11-11: the file alone counted 1 contract at $5,035 where every other way counts
//      100 shares at $50.35); a bond's cost per $100 of face ÷ 100 (its units are dollars of face).
//   5. AN UNKNOWN IS NOT $0: a file with no cash line gives no cash; a file with no value column gives no values.
//   6. THE SAME FILE IMPORTED TWICE ADDS NOTHING (fileRowsToSave).

import {
  addRows, dayOrNull, oneHoldingSpelling, openPurchases, purchasesFromList, rowsInForce, sortArriving, valueBatchesOf, valueRows,
  type AssetRow, type EventQuestion, type ListedPurchase, type ListQuestion, type NewRow,
} from './asset-record';
import { importedAccountOf, valueOnlyAccountsOf, type ImportedHolding, type ImportResult } from '../../../src/domain/import/holdingsImport';

/** What one file gives the record: events (none in a holdings file), the purchases listed per holding, the values of
 *  the file's day, the facts of each bond or CD, the file's own day, and whether the account holder must be asked it. */
export interface FileRows {
  events: NewRow[];
  lists: { holding: string; listed: ListedPurchase[] }[];
  values: NewRow[];
  /** The values of each row with a value and no quantity, on the account the import makes for it (valueOnlyAccountsOf),
   *  where its number was handed in: that account holds it, the file's account does not (outside check, 2026-11-12). */
  valueOnlyValues: NewRow[];
  facts: NewRow[];
  listDay: string | null;
  needsADate: boolean;
}

/** The account's import, read once: which file rows became holdings, which are value-only, and the cash. */
/* ─ MK-NW-F-195 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * readImport
 *
 * Answers ..... The account's import, read once: which file rows became holdings, which are value-only, and the cash.
 *
 * Formula .....
 *     value only = value only accounts of(result, { institution: '', now iso: '1970 − 01 − 01T00:00:00.000Z' }) as unknown as { label: string; balance: number }[]
 *     held = [], rest: imported holding[] = []
 *     p = 0
 *     pos = account.positions[p]
 *     value only rows = []
 *     v = 0
 *     acc = value only[v]
 *     cash rows = count of rest.length − value only rows
 *     the answer:
 *     held = held
 *     value only rows = value only rows
 *     cash = account.cash balance   if cash rows > 0
 *     nothing   otherwise
 *     balance = account.balance
 *
 * Called by ... MK-NW-F-199 fileToRecord
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-199 fileToRecord
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-195
 * Changed ..... not in git yet (—)
 */
function readImport(result: ImportResult) {
  // the fixed time only fills the account's "last synced"; nothing here reads it
  const account = importedAccountOf(result, { institution: '', name: '', nowIso: '1970-01-01T00:00:00.000Z' }) as unknown as {
    cash_balance: number; balance: number; positions: { ticker: string; lots: { shares: number }[] }[];
  };
  const valueOnly = valueOnlyAccountsOf(result, { institution: '', nowIso: '1970-01-01T00:00:00.000Z' }) as unknown as { label: string; balance: number }[];
  // the account's holdings are the file's rows in the file's order; each is found by its name and its shares
  const held: ImportedHolding[] = [], rest: ImportedHolding[] = [];
  let p = 0;
  for (const h of result.holdings) {
    const pos = account.positions[p];
    if (pos && pos.ticker === (h.ticker || h.symbol.trim().toUpperCase()) && pos.lots[0]?.shares === h.shares) { held.push(h); p++; } else rest.push(h);
  }
  if (p !== account.positions.length) throw new Error(`The file’s ${account.positions.length} holdings could not all be found among its rows (found ${p}).`);
  const valueOnlyRows: ImportedHolding[] = [];
  let v = 0;
  for (const h of rest) {
    const acc = valueOnly[v];
    if (acc && acc.label === (h.label || h.symbol) && acc.balance === h.value) { valueOnlyRows.push(h); v++; }
  }
  if (v !== valueOnly.length) throw new Error(`The file’s ${valueOnly.length} value-only rows could not all be found among its rows (found ${v}).`);
  const cashRows = rest.length - valueOnlyRows.length;
  return { held, valueOnlyRows, cash: cashRows > 0 ? account.cash_balance : null, balance: account.balance };
}

/** A file holding's name, written the one way the record writes every holding's name. */
/* ─ MK-NW-F-196 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * fileHoldingName
 *
 * Answers ..... A file holding's name, written the one way the record writes every holding's name.
 *
 * Formula .....
 *     one holding spelling(ticker or symbol) as string
 *
 * Called by ... MK-NW-F-199 fileToRecord
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-199 fileToRecord
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-196
 * Changed ..... not in git yet (—)
 */
const fileHoldingName = (h: ImportedHolding): string => oneHoldingSpelling(h.ticker || h.symbol) as string;

/** Shares as the record counts them (rule 4): an option's contracts × its shares a contract; anything else as given. */
/* ─ MK-NW-F-197 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * unitsOf
 *
 * Answers ..... Shares as the record counts them (rule 4): an option's contracts × its shares a contract; anything else as given.
 *
 * Formula .....
 *     shares × multiplier   if multiplier ≠ nothing
 *     shares   otherwise
 *
 * Called by ... MK-NW-F-199 fileToRecord · MK-NW-F-228 moveOldCopies
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-199 fileToRecord
 *               MK-NW-F-228 moveOldCopies · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-197
 * Changed ..... not in git yet (—)
 */
const unitsOf = (h: ImportedHolding): number => (h.multiplier != null ? h.shares * h.multiplier : h.shares);

/** A purchase's price per unit as the record counts units (rule 4). Null where the file gives no cost. */
/* ─ MK-NW-F-198 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * costPerUnit
 *
 * Answers ..... A purchase's price per unit as the record counts units (rule 4).
 *
 * Formula .....
 *     nothing   when not (cost per share > 0)
 *     cost per share ÷ 100   when price quote = 'per_100_of_face'
 *     cost per share
 *
 * Called by ... MK-NW-F-199 fileToRecord
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-NW-F-199 fileToRecord
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-198
 * Changed ..... not in git yet (—)
 */
function costPerUnit(h: ImportedHolding): number | null {
  if (!(h.costPerShare > 0)) return null;           // the import writes 0 where the file gives no cost
  if (h.priceQuote === 'per_100_of_face') return h.costPerShare / 100;
  return h.costPerShare;
}

/** ONE IMPORTED FILE, AS THE ROWS OF THE RECORD — in the calling order of asset-record.ts. */
/* ─ MK-NW-F-199 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * fileToRecord
 *
 * Answers ..... ONE IMPORTED FILE, AS THE ROWS OF THE RECORD — in the calling order of asset-record.ts.
 *
 * Formula .....
 *     list day = day or null(result.as of)
 *     average = ÷ average|avg ÷ test(result.mapped.cost ?? '')
 *     has values = result.mapped.value ≠ nothing
 *     by holding = new map<string, listed purchase[]>()
 *     line = date = day or null(date)
 *     shares = units of(h)
 *     price = cost per unit(h)
 *     ...(average ? { average: true } : {}) = ...(average ? { average: true } : {})
 *     lists = for each of [...by holding]: [holding, listed]) => ({ holding, listed }
 *     elsewhere = Σ over value only rows of (value)
 *     stated = result.account.stated total (or nothing when missing)
 *     owner of = (h: imported holding) => { const i = value only rows.index of(h); return i ≥ 0 and value only ids[i] ≠ nothing ? value only ids[i] : account id; }
 *     the answer:
 *     events = []
 *     lists = lists
 *     values = values
 *     value only values = value only values
 *     facts = facts
 *     list day = list day
 *     needs adate = list day = nothing
 *
 * Called by ... MK-NW-F-201 fileRowsToSave
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-068 how a linked bond's price is quoted — per $100 of face value, or per unit like a share
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-199
 * Changed ..... 2026-11-11 (c4a137f1)
 */
export function fileToRecord(result: ImportResult, accountId: string, valueOnlyIds: readonly string[] = []): FileRows {
  const listDay = dayOrNull(result.asOf);
  const { held, valueOnlyRows, cash } = readImport(result);
  const average = /average|avg/i.test(result.mapped.cost ?? '');
  const hasValues = result.mapped.value != null;

  const byHolding = new Map<string, ListedPurchase[]>();
  for (const h of held) {
    const line: ListedPurchase = { date: dayOrNull(h.date), shares: unitsOf(h), price: costPerUnit(h), ...(average ? { average: true } : {}) };
    byHolding.set(fileHoldingName(h), [...(byHolding.get(fileHoldingName(h)) ?? []), line]);
  }
  const lists = [...byHolding].map(([holding, listed]) => ({ holding, listed }));

  // a row with a value and no quantity is held by its own account, as the import saves it (valueOnlyAccountsOf), never by
  // this one (outside check, 2026-11-12: a $5,000 bond put $8,000 on an account the phone shows at $3,000). The file's
  // own total covers it, so the check this account is set against is that total less what those accounts hold.
  const elsewhere = valueOnlyRows.reduce((t, h) => t + h.value, 0);
  const stated = result.account?.statedTotal ?? null;
  const values = valueRows({
    accountId, date: listDay, source: 'file', cash, statedTotal: stated == null ? null : stated - elsewhere,
    holdings: held.map((h) => ({ holding: fileHoldingName(h), shares: unitsOf(h), price: h.lastPrice ?? null, value: hasValues ? h.value : null })),
  });
  // each such account holds that one value and no cash, on the file's day
  const valueOnlyValues = valueOnlyRows.flatMap((h, i) => (valueOnlyIds[i] == null ? [] : valueRows({
    accountId: valueOnlyIds[i], date: listDay, source: 'file', cash: 0, holdings: [{ holding: fileHoldingName(h), shares: null, price: null, value: h.value }],
  })));
  const ownerOf = (h: ImportedHolding) => { const i = valueOnlyRows.indexOf(h); return i >= 0 && valueOnlyIds[i] != null ? valueOnlyIds[i] : accountId; };

  const facts: NewRow[] = [...held, ...valueOnlyRows]
    .filter((h) => h.assetClass === 'bonds' || h.faceValue != null || h.couponRate != null || h.maturityDate != null || h.multiplier != null)
    .map((h) => ({
      accountId: ownerOf(h), holding: fileHoldingName(h), kind: 'FACT' as const, date: null, source: 'file' as const,
      facts: {
        ...(h.faceValue != null ? { face_value: h.faceValue } : {}),
        ...(h.couponRate != null ? { coupon_rate: h.couponRate } : {}),
        ...(h.maturityDate ? { maturity_date: h.maturityDate } : {}),
        ...(h.priceQuote ? { price_quote: h.priceQuote } : {}),
        ...(h.multiplier != null ? { multiplier: h.multiplier } : {}),
      },
    }))
    .filter((f) => Object.keys(f.facts).length > 0);

  // a holdings file carries no activity rows: importHoldings reads none
  return { events: [], lists, values, valueOnlyValues, facts, listDay, needsADate: listDay == null };
}

/** Whether two lists of values or facts read the same, so a file imported twice adds nothing it already saved. */
/* ─ MK-NW-F-200 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sameJson
 *
 * Answers ..... Whether two lists of values or facts read the same, so a file imported twice adds nothing it already saved.
 *
 * Formula .....
 *     JSON.stringify(a) = JSON.stringify(b)
 *
 * Called by ... MK-NW-F-201 fileRowsToSave
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-201 fileRowsToSave · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-200
 * Changed ..... not in git yet (—)
 */
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** THE CALLING ORDER, RUN: the rows to save for one file, and the questions for the account holder. The values are left
 *  out where the record already holds the same values from a file for that day; a fact where the record already holds
 *  it from a file. So the same file imported twice adds nothing. */
/* ─ MK-NW-F-201 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * fileRowsToSave
 *
 * Answers ..... THE CALLING ORDER, RUN: the rows to save for one file, and the questions for the account holder.
 *
 * Formula .....
 *     f = file to record(result, account id ?? '', value only ids)
 *     in force = rows in force(record)
 *     new facts = (facts: new row[]) => facts where !in force.some((r) => kind = 'FACT' and source = 'file' and account id = account id and holding = holding and same json(facts, facts))
 *     []   when count of values is missing
 *     own = values[0], holdings = values.slice(1)
 *     the answer:
 *     []   if already
 *     values   otherwise
 *     value only = []
 *     sorted = sort arriving(record, events)
 *     after events = add rows(record, sorted.save, '')
 *     purchases = [], ask lists: list question[] = []
 *     got = purchases from list(after events, account id, holding, listed, 'file', list day, sorted.ask)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-201
 * Changed ..... 2026-11-11 (d188fd68)
 */
export function fileRowsToSave(record: readonly AssetRow[], result: ImportResult, accountId: string | null, valueOnlyIds: readonly string[] = []): {
  rows: NewRow[]; listDay: string | null; needsADate: boolean; askEvents: EventQuestion[]; askLists: ListQuestion[];
} {
  const f = fileToRecord(result, accountId ?? '', valueOnlyIds);
  const inForce = rowsInForce(record);
  const newFacts = (facts: NewRow[]) => facts.filter((x) => !inForce.some((r) => r.kind === 'FACT' && r.source === 'file' && r.accountId === x.accountId && r.holding === x.holding && sameJson(r.facts, x.facts)));
  // the values of one account, left out where the record already holds the same values from a file for that day
  const notYetSaved = (values: NewRow[]): NewRow[] => {
    if (!values.length) return [];
    const own = values[0], holdings = values.slice(1);
    const already = valueBatchesOf(record, own.accountId).some((b) => b.source === 'file' && b.date === f.listDay && !b.typed
      && b.cash === (own.amount ?? null) && b.statedTotal === (own.statedTotal ?? null) && b.typedValue == null
      && sameJson(b.holdings, holdings.map((h) => ({ holding: oneHoldingSpelling(h.holding), shares: h.shares ?? null, price: h.price ?? null, value: h.amount ?? null }))));
    return already ? [] : values;
  };
  // each account holding a value-only row has two rows: its own (no cash) and the one value
  const valueOnly: NewRow[] = [];
  for (let i = 0; i < f.valueOnlyValues.length; i += 2) valueOnly.push(...notYetSaved(f.valueOnlyValues.slice(i, i + 2)));
  if (accountId == null) {
    return { rows: [...valueOnly, ...newFacts(f.facts.filter((x) => x.accountId !== ''))], listDay: f.listDay, needsADate: f.needsADate, askEvents: [], askLists: [] };
  }

  const sorted = sortArriving(record, f.events);
  const afterEvents = addRows(record, sorted.save, '');
  const purchases: NewRow[] = [], askLists: ListQuestion[] = [];
  for (const { holding, listed } of f.lists) {
    const got = purchasesFromList(afterEvents, accountId, holding, listed, 'file', f.listDay, sorted.ask);
    purchases.push(...got.rows); askLists.push(...got.ask);
  }
  // A HOLDING THE FILE NO LONGER LISTS (outside check, 2026-11-12: Jun 21 listed 5 MSFT, Jul 21 did not, and nothing was
  // asked): set against an empty list, so it is asked as any other difference is, and its shares stay until answered —
  // unless every purchase of it still held is dated after the file's own day, which the file could not have listed
  const listedNow = new Set(f.lists.map((l) => l.holding));
  const heldOnRecord = [...new Set(rowsInForce(afterEvents).filter((r) => r.accountId === accountId && r.kind === 'PURCHASE' && r.holding != null).map((r) => r.holding as string))];
  for (const holding of heldOnRecord) {
    if (listedNow.has(holding)) continue;
    const open = openPurchases(afterEvents, accountId, holding);
    if (!open.length || (f.listDay != null && open.every((p) => p.date != null && p.date > (f.listDay as string)))) continue;
    askLists.push(...purchasesFromList(afterEvents, accountId, holding, [], 'file', f.listDay, sorted.ask).ask);
  }
  return { rows: [...sorted.save, ...purchases, ...notYetSaved(f.values), ...valueOnly, ...newFacts(f.facts)], listDay: f.listDay, needsADate: f.needsADate, askEvents: sorted.ask, askLists };
}
