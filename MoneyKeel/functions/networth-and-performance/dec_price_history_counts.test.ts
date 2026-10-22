/** DEC-5291 (owner, 2026-10-13, his word: "approved.") — "Let price history count. When a period starts before the
 *  daily record, work it back from each holding's price history and name what's left out, rather than greying it. No
 *  balance is invented, because the figures come from real prices, so DEC-0230 still holds for the values you typed."
 *
 *  It replaces DEC-3035i for a record that exists but begins after the window opens: that window is now worked back by
 *  the DEC-3656 / DEC-5068 path (today's values less each holding's known gain less the money moved; Return = the holdings
 *  with a history, MK-NW-F-138 knownHoldingsReturn; a holding with no history named by MK-NW-F-130). DEC-3035i's refusal
 *  stands only where NO holding in the window has a history. Function: MK-NW-O-008 thePerformance.
 *
 *  THE APPROVED EXAMPLE, worked by hand. Vanguard linked today, VTI $40,000 with a year of prices (+10%); Treasury 2031
 *  $10,000 typed by hand as its own account. The daily record begins today (Home writes it on first open). 1Y:
 *    VTI gained 40,000 × (1 − 1 ÷ 1.10)            = $3,636.36
 *    beginning = 50,000 − 3,636.36                   = $46,363.64
 *    Wealth generated $3,636 · Return 40,000 ÷ 36,363.64 − 1 = +10.00%
 *    "Wealth generated and Return do not include Treasury 2031's gains, as it has no price history."
 *  Before: no walk, Return "—", "The record begins Oct 13, 2026, so it cannot say what these accounts were worth on Oct 12, 2025."
 */
import { thePerformance, windowStartKey } from './performance';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

const TODAY = '2026-10-13';
const ONE_YEAR = windowStartKey('1Y', [], TODAY)!;          // 2025-10-13; the beginning is read for 2025-10-12
const SENTENCE = "Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.";   // reworded 2026-10-19 by DEC-6076

const VANGUARD = { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', asset_class: 'stocks_etf', balance: 40000,
  source: 'connected', positions: [{ position_id: 'p-vti', ticker: 'VTI', last_price: 250, lots: [{ lot_id: 'l1', shares: 160, cost_per_share: 200, purchase_date: '2023-01-03' }] }] };
const TREASURY = { asset_id: 't31', label: 'Treasury 2031', kind: 'fixed_income', asset_class: 'bonds', balance: 10000, positions: [] };
const VTI_ROW = { position: { position_id: 'p-vti', ticker: 'VTI' }, marketValue: 40000, periodReturn: 0.10, periodTotal: 0.10 };
const recordToday = (accounts: any[]) => [buildDayFromAccounts(accounts as any, TODAY, `${TODAY}T09:00:00Z`)];
const typedDay = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });

const ask = (ids: string[], accounts: any[], holdings: any[], snapshotDays: any[], transactions: any[] = [], windowStart = ONE_YEAR) => thePerformance({
  windowStart, windowLabel: 'past year', today: TODAY, transactions, snapshotDays,
  investmentAccountIds: new Set(ids), accounts, holdings,
});

describe('MK-NW-O-008 thePerformance — a record that begins today, worked back from price history (DEC-5291, 2026-10-13)', () => {
  const accounts = [VANGUARD, TREASURY];
  const days = recordToday(accounts);

  test('THE APPROVED EXAMPLE, all accounts: Wealth generated $3,636, Return +10.00%, the sentence — not greyed', () => {
    const f = ask(['van', 't31'], accounts, [VTI_ROW], days);
    expect(f.measured).toBeNull();
    expect(f.workedBack).toBe(true);                                      // not greyed
    expect(f.walk!.ending).toBe(50000);
    expect(f.walk!.wealthGenerated).toBeCloseTo(3636.3636, 4);
    expect(f.walk!.beginning).toBeCloseTo(46363.6364, 4);
    expect(f.ret!).toBeCloseTo(0.10, 12);
    expect(f.notIncluded).toBe(SENTENCE);
    expect(f.sentence).toBe('');                                          // was "The record begins Oct 13, 2026, so it cannot say what these accounts were worth on Oct 12, 2025."
  });

  test('the cards: Vanguard alone is worked back ($3,636, +10.00%, nothing named); Treasury 2031 alone has no history, so DEC-3035i\'s refusal stands', () => {
    const van = ask(['van'], accounts, [VTI_ROW], days);
    expect(van.walk!.beginning).toBeCloseTo(36363.6364, 4);
    expect(van.walk!.wealthGenerated).toBeCloseTo(3636.3636, 4);
    expect(van.ret!).toBeCloseTo(0.10, 12);
    expect(van.notIncluded).toBe('');
    const t31 = ask(['t31'], accounts, [], days);
    expect(t31.walk).toBeNull();
    expect(t31.ret).toBeNull();
    expect(t31.sentence).toBe('The record begins Oct 13, 2026, so it cannot say what this account was worth on Oct 12, 2025.');
    // THE SUMMARY IS THE CARDS ADDED UP: Vanguard's walk + Treasury 2031 at its value now, taken as unchanged ($0 gained)
    const all = ask(['van', 't31'], accounts, [VTI_ROW], days);
    expect(all.walk!.beginning).toBeCloseTo(van.walk!.beginning + 10000, 9);
    expect(all.walk!.wealthGenerated).toBeCloseTo(van.walk!.wealthGenerated + 0, 9);
    expect(all.walk!.ending).toBe(van.walk!.ending + t31.ending);
  });

  test('no holding with a history anywhere: the record that begins too late still refuses, in DEC-3035i\'s words', () => {
    const f = ask(['van', 't31'], accounts, [{ ...VTI_ROW, periodReturn: null, periodTotal: null, position: { position_id: 'p-vti', ticker: 'VTI', last_price: 250, lots: [{ shares: 160 }] } }], days);
    expect(f.walk).toBeNull();
    expect(f.ret).toBeNull();
    expect(f.workedBack).toBe(false);
    expect(f.sentence).toBe('The record begins Oct 13, 2026, so it cannot say what these accounts were worth on Oct 12, 2025.');
  });

  // DEC-2159 / his 2026-10-20 words, "always the class broker sends": SPAXX is cash here because the broker flags it
  // cash-equivalent — the flag the sync now keeps on the holding. It was cash by its stored tag alone, while Net worth's
  // class rows read the same stored holding by its name as Stocks / Funds; both now ask the one order (MK-NW-F-109).
  test('cash gains nothing and is never named as having no price history (DEC-2159 / his 2026-10-20 words: the broker flags SPAXX cash)', () => {
    const withCash = { ...VANGUARD, balance: 45000, positions: [...VANGUARD.positions, { position_id: 'p-cash', ticker: 'SPAXX', asset_class: 'cash', cash_equivalent: true, value_now: 5000, lots: [{ lot_id: 'l2', shares: 5000, cost_per_share: 1, purchase_date: '2023-01-03' }] }] };
    const cashRow = { position: { position_id: 'p-cash', ticker: 'SPAXX', asset_class: 'cash', cash_equivalent: true, value_now: 5000, lots: [{ shares: 5000 }] }, marketValue: 5000, periodReturn: null };
    const f = ask(['van'], [withCash], [VTI_ROW, cashRow], recordToday([withCash]));
    expect(f.walk!.wealthGenerated).toBeCloseTo(3636.3636, 4);            // the cash added $0
    expect(f.walk!.beginning).toBeCloseTo(45000 - 3636.3636, 4);
    expect(f.ret!).toBeCloseTo(0.10, 12);                                 // Return is the holdings with a price history
    expect(f.notIncluded).toBe('');                                       // cash is not "no price history"
  });
});

describe('the mixed case: one account the record reaches, one it does not (DEC-5291)', () => {
  // Fidelity: recorded at $100,000 since Jun 1, 2025, $112,000 today, no money moved → measured +12.00%.
  // Vanguard: linked today, VTI $40,000 at +10% over the year → worked back, $36,363.64 → $40,000.
  const FIDELITY = { asset_id: 'fid', label: 'IRA', institution: 'Fidelity', kind: 'ira', asset_class: 'mixed', balance: 112000, positions: [] };
  const accounts = [FIDELITY, VANGUARD];
  const days = [typedDay('2025-06-01', { fid: 100000 }), ...recordToday(accounts)];

  test('the summary is the cards added up, line by line; Return weighs each part by its value now ÷ (1 + its return)', () => {
    const fid = ask(['fid'], accounts, [], days);
    const van = ask(['van'], accounts, [VTI_ROW], days);
    const all = ask(['fid', 'van'], accounts, [VTI_ROW], days);
    expect(fid.measured).toBe(100000);                                     // the record reaches Fidelity: read, measured
    expect(fid.ret!).toBeCloseTo(0.12, 12);
    expect(van.workedBack).toBe(true);
    for (const k of ['beginning', 'contributions', 'withdrawals', 'wealthGenerated', 'dividends', 'interest', 'ending'] as const) {
      expect(all.walk![k]).toBeCloseTo(fid.walk![k] + van.walk![k], 9);
    }
    expect(all.walk!.beginning).toBeCloseTo(136363.6364, 4);               // 100,000 + 36,363.64
    expect(all.walk!.wealthGenerated).toBeCloseTo(15636.3636, 4);          // 12,000 + 3,636.36
    expect(all.walk!.ending).toBe(152000);
    // (112,000 + 40,000) ÷ (112,000 ÷ 1.12 + 40,000 ÷ 1.10) − 1 = 152,000 ÷ 136,363.64 − 1 = +11.47%
    expect(all.ret!).toBeCloseTo(152000 / (100000 + 40000 / 1.1) - 1, 12);
    expect(all.ret!).toBeCloseTo(0.114667, 6);
    expect(all.workedBack).toBe(true);
    expect(all.covered).toBe(false);
    expect(all.notIncluded).toBe('');
  });

  test('…and a holding with no history in the worked-back account is named under the summary', () => {
    const vanT = { ...VANGUARD, balance: 50000, positions: [...VANGUARD.positions, { position_id: 'p-t', ticker: '912810TM0', label: 'Treasury 2031', value_now: 10000, lots: [{ lot_id: 'l3', shares: 10000, cost_per_share: 1, purchase_date: '2023-01-03' }] }] };
    const tRow = { position: { position_id: 'p-t', ticker: '912810TM0', label: 'Treasury 2031', value_now: 10000, lots: [{ shares: 10000 }] }, periodReturn: null };
    const accts = [FIDELITY, vanT];
    const all = ask(['fid', 'van'], accts, [VTI_ROW, tRow], [typedDay('2025-06-01', { fid: 100000 }), ...recordToday(accts)]);
    expect(all.walk!.beginning).toBeCloseTo(100000 + 46363.6364, 4);
    // the return is on Fidelity's measured $112,000 and VTI's $40,000 = $152,000 (DEC-6076)
    expect(all.notIncluded).toBe('Return is on the $152,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.');
  });
});

describe('unchanged: a window the record DOES reach keeps the measured time-weighted return (DEC-4439)', () => {
  test('$100,000 → $10,000 added Mar 1 (worth $115,000 that evening) → $121,000 today: +10.00%, not the holding\'s +50% price move', () => {
    const A = { asset_id: 'fid', label: 'IRA', institution: 'Fidelity', kind: 'brokerage', asset_class: 'stocks_etf', balance: 121000,
      positions: [{ position_id: 'p-x', ticker: 'XYZ', last_price: 121, lots: [{ lot_id: 'lx', shares: 1000, cost_per_share: 80, purchase_date: '2023-01-03' }] }] };
    const f = ask(['fid'], [A], [{ position: { position_id: 'p-x', ticker: 'XYZ' }, marketValue: 121000, periodReturn: 0.5, periodTotal: 0.5 }],
      [typedDay('2025-06-01', { fid: 100000 }), typedDay('2026-03-01', { fid: 115000 })],
      [{ id: 'd', type: 'DEPOSIT', account_id: 'fid', amount: 10000, date: '2026-03-01' }]);
    expect(f.covered).toBe(true);
    expect(f.workedBack).toBe(false);
    expect(f.measured).toBe(100000);
    // 115,000 ÷ (100,000 + 10,000) × 121,000 ÷ 115,000 − 1 = 121,000 ÷ 110,000 − 1 = +10.00%
    expect(f.ret!).toBeCloseTo(0.10, 12);
    expect(f.notIncluded).toBe('');
  });
});
