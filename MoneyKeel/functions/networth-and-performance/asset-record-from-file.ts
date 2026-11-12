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
  addRows, dayOrNull, oneHoldingSpelling, purchasesFromList, rowsInForce, sortArriving, valueBatchesOf, valueRows,
  type AssetRow, type EventQuestion, type ListedPurchase, type ListQuestion, type NewRow,
} from './asset-record';
import { importedAccountOf, valueOnlyAccountsOf, type ImportedHolding, type ImportResult } from '../../../src/domain/import/holdingsImport';

/** What one file gives the record: events (none in a holdings file), the purchases listed per holding, the values of
 *  the file's day, the facts of each bond or CD, the file's own day, and whether the account holder must be asked it. */
export interface FileRows {
  events: NewRow[];
  lists: { holding: string; listed: ListedPurchase[] }[];
  values: NewRow[];
  facts: NewRow[];
  listDay: string | null;
  needsADate: boolean;
}

/** The account's import, read once: which file rows became holdings, which are value-only, and the cash. */
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

const fileHoldingName = (h: ImportedHolding): string => oneHoldingSpelling(h.ticker || h.symbol) as string;

/** Shares as the record counts them (rule 4): an option's contracts × its shares a contract; anything else as given. */
const unitsOf = (h: ImportedHolding): number => (h.multiplier != null ? h.shares * h.multiplier : h.shares);

/** A purchase's price per unit as the record counts units (rule 4). Null where the file gives no cost. */
function costPerUnit(h: ImportedHolding): number | null {
  if (!(h.costPerShare > 0)) return null;           // the import writes 0 where the file gives no cost
  if (h.priceQuote === 'per_100_of_face') return h.costPerShare / 100;
  return h.costPerShare;
}

/** ONE IMPORTED FILE, AS THE ROWS OF THE RECORD — in the calling order of asset-record.ts. */
export function fileToRecord(result: ImportResult, accountId: string): FileRows {
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

  const values = valueRows({
    accountId, date: listDay, source: 'file', cash, statedTotal: result.account?.statedTotal ?? null,
    holdings: [
      ...held.map((h) => ({ holding: fileHoldingName(h), shares: unitsOf(h), price: h.lastPrice ?? null, value: hasValues ? h.value : null })),
      ...valueOnlyRows.map((h) => ({ holding: fileHoldingName(h), shares: null, price: null, value: h.value })),
    ],
  });

  const facts: NewRow[] = [...held, ...valueOnlyRows]
    .filter((h) => h.assetClass === 'bonds' || h.faceValue != null || h.couponRate != null || h.maturityDate != null || h.multiplier != null)
    .map((h) => ({
      accountId, holding: fileHoldingName(h), kind: 'FACT' as const, date: null, source: 'file' as const,
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
  return { events: [], lists, values, facts, listDay, needsADate: listDay == null };
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** THE CALLING ORDER, RUN: the rows to save for one file, and the questions for the account holder. The values are left
 *  out where the record already holds the same values from a file for that day; a fact where the record already holds
 *  it from a file. So the same file imported twice adds nothing. */
export function fileRowsToSave(record: readonly AssetRow[], result: ImportResult, accountId: string): {
  rows: NewRow[]; listDay: string | null; needsADate: boolean; askEvents: EventQuestion[]; askLists: ListQuestion[];
} {
  const f = fileToRecord(result, accountId);
  const sorted = sortArriving(record, f.events);
  const afterEvents = addRows(record, sorted.save, '');
  const purchases: NewRow[] = [], askLists: ListQuestion[] = [];
  for (const { holding, listed } of f.lists) {
    const got = purchasesFromList(afterEvents, accountId, holding, listed, 'file', f.listDay, sorted.ask);
    purchases.push(...got.rows); askLists.push(...got.ask);
  }
  const own = f.values[0], holdings = f.values.slice(1);
  const already = valueBatchesOf(record, accountId).some((b) => b.source === 'file' && b.date === f.listDay && !b.typed
    && b.cash === (own.amount ?? null) && b.statedTotal === (own.statedTotal ?? null) && b.typedValue == null
    && sameJson(b.holdings, holdings.map((h) => ({ holding: oneHoldingSpelling(h.holding), shares: h.shares ?? null, price: h.price ?? null, value: h.amount ?? null }))));
  const inForce = rowsInForce(record);
  const facts = f.facts.filter((x) => !inForce.some((r) => r.kind === 'FACT' && r.source === 'file' && r.accountId === accountId && r.holding === x.holding && sameJson(r.facts, x.facts)));
  return { rows: [...sorted.save, ...purchases, ...(already ? [] : f.values), ...facts], listDay: f.listDay, needsADate: f.needsADate, askEvents: sorted.ask, askLists };
}
