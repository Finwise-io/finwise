/** A day of the daily record, for tests: what each account was worth at the close of that day.
 *
 *  Since 2026-10-04 every return is time-weighted (DEC-1669), so a test that wants a return on screen
 *  has to say what each account was worth on the day it is measured from — a single total for the
 *  household is no longer enough to measure anything.
 *
 *  A row is [account, value, kind]: 'holding' (a priced security — the default), 'cash', or 'typed'
 *  (a balance somebody typed, with no holdings behind it).
 */
export type RecordedRow = [accountId: string, value: number, kind?: 'holding' | 'cash' | 'typed'];

export function recordedDay(date: string, rows: RecordedRow[], origin: 'observed' | 'reconstructed' = 'observed'): any {
  const accounts = [...new Set(rows.map((r) => r[0]))];
  return {
    date, origin, writtenAt: `${date}T00:00:00Z`,
    holdings: rows.filter((r) => (r[2] ?? 'holding') === 'holding')
      .map(([accountId, value], i) => ({ date, accountId, securityKey: `H${i}`, symbol: `H${i}`, units: 1, price: value, value, currency: 'USD' })),
    accounts: accounts.map((accountId) => ({
      date, accountId, statedTotal: null, currency: 'USD',
      cash: rows.filter((r) => r[0] === accountId && r[2] === 'cash').reduce((t, r) => t + r[1], 0),
      typedValue: rows.some((r) => r[0] === accountId && r[2] === 'typed') ? rows.filter((r) => r[0] === accountId && r[2] === 'typed').reduce((t, r) => t + r[1], 0) : null,
    })),
  };
}
