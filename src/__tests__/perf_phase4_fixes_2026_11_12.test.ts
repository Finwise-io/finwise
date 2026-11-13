/** PERFORMANCE PHASE 4 — the fixes built before his review (2026-11-12). Analysis: phase4-recommendations.md, items 3, 6 and
 *  DEC-10558. Each case is asked the way the Performance tab asks it: MK-PF-F-014 buildPerformance builds the rows, MK-NW-O-008
 *  thePerformance answers the window. Every expected figure is worked by hand on its own line.
 *
 *  Item 3 — interest stops at maturity: KEY BANK CD 3.85%, $109,992.74 today, maturing Aug 24, 2026, over 1 year to Nov 10, 2026
 *           earned 366 days = $4,088.69; it earns 288 days (Nov 10, 2025 → Aug 24, 2026) = $3,230.
 *  Item 6 — the account cards share each printed line of the total (MK-XS-F-194 partsShown): three accounts $1,000.40 → $1,100.80
 *           read $101 × 3 = $303 against a total of $301; they read $100 + $101 + $100 = $301, endings $3,302, beginnings $3,001.
 *  DEC-10558 — "if price is stale, app just state so. but still display it and use it." (his words, 2026-11-11). VTI on 1 year
 *           from Sep 30, 2025 with only its Aug 1, 2024 close of $70 and $100 today: it was left out; it reads +42.86% and the
 *           sentence gives Aug 1, 2024 and says the return covers more than the window. It replaces the lead's DEC-9486 (R19).
 */
import { buildPerformance } from '../domain/performance';
import { thePerformance, windowStartKey, accountWalksShown, walkEndingAtOwnValue } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { walkShown } from '../../MoneyKeel/functions/_figure-spec';
import { daysEarning } from '../../Calculation Module code/engines/window-return';
import { buildDayFromAccounts } from '../../Calculation Module code/engines/snapshots';

// ═══ Item 3 ════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('item 3 · a CD earns its rate only up to its maturity date', () => {
  const T = '2026-11-10';
  const VALUE = 110_000 * 0.999934;                                    // $109,992.74, his file's value
  const cdPos = (maturity: string | undefined) => ({ position_id: 'cd', ticker: 'KEY BANK CD 3.85% 08/24/2026', label: 'KEY BANK CD 3.85% 08/24/2026',
    kind: 'cd', asset_class: 'bond', coupon_rate: 0.0385, ...(maturity ? { maturity_date: maturity } : {}), last_price: 0.999934,
    lots: [{ lot_id: 'l', shares: 110_000, cost_per_share: 1, purchase_date: '' }] });
  const acct = (p: any) => ({ asset_id: 'rh', label: 'Robinhood -2203', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE',
    balance: VALUE, cash_balance: 0, positions: [p] });
  const gain = (days: number) => VALUE * (1 - 1 / Math.pow(1.0385, days / 365));
  function oneYear(maturity: string | undefined, recordFrom?: string) {
    const a = acct(cdPos(maturity));
    const rows = buildPerformance(a.positions as any, () => null, '1Y', new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts: [a] });
    const days = [...(recordFrom ? [buildDayFromAccounts([a] as any, recordFrom, `${recordFrom}T09:00:00Z`)] : []), buildDayFromAccounts([a] as any, T, `${T}T09:00:00Z`)];
    const f = thePerformance({ windowStart: windowStartKey('1Y', [recordFrom ?? T], T), windowLabel: '1 year', today: T, holdings: rows as any,
      priceOf: () => null, transactions: [], snapshotDays: days, investmentAccountIds: new Set(['rh']), accounts: [a] });
    return { f, row: rows[0] as any };
  }

  test('the engine: 288 days to Aug 24, 2026 inside the window; 366 with no maturity; 0 matured before it began', () => {
    expect(daysEarning('2025-11-10', '2026-11-10', '2026-08-24')).toBe(288);   // Nov 10, 2025 → Aug 24, 2026, both ends inside
    expect(daysEarning('2025-11-10', '2026-11-10', null)).toBe(366);
    expect(daysEarning('2025-11-10', '2026-11-10', '2027-01-01')).toBe(366);
    expect(daysEarning('2025-11-10', '2026-11-10', '2025-06-01')).toBe(0);
    expect(daysEarning('2025-11-10', '2026-11-10', '2026-02-31')).toBe(366);  // not a real day: not on record
  });

  test('his CD, 1 year to Nov 10, 2026: $4,088.69 over 366 days becomes $3,230 over 288 days', () => {
    expect(gain(366)).toBeCloseTo(4088.69, 1);                         // before: 109,992.74 × (1 − 1 ÷ 1.0385^(366/365))
    const { f, row } = oneYear('2026-08-24');
    expect(row.periodTotal).toBeCloseTo(Math.pow(1.0385, 288 / 365) - 1, 12);
    expect(f.walk!.wealthGenerated).toBeCloseTo(gain(288), 6);         // 109,992.74 × (1 − 1 ÷ 1.0385^(288/365)) = $3,230.30
    expect(Math.round(f.walk!.wealthGenerated)).toBe(3230);
    expect(f.walk!.beginning).toBeCloseTo(VALUE - gain(288), 6);
  });

  test('a CD with no maturity on record keeps the whole window: 366 days, $4,089', () => {
    expect(Math.round(oneYear(undefined).f.walk!.wealthGenerated)).toBe(4089);
  });

  test('a CD that matured before the window began earns $0', () => {
    const { f, row } = oneYear('2025-06-01');
    expect(row.periodTotal).toBe(0);
    expect(f.walk!.wealthGenerated).toBe(0);
    expect(f.walk!.beginning).toBeCloseTo(VALUE, 6);
  });

  test('a record that begins Sep 1, 2026, after it matured: the days before are worked back to maturity only — still $3,230', () => {
    const { f } = oneYear('2026-08-24', '2026-09-01');
    expect(f.recordBegins).toBe('2026-09-01');
    expect(f.walk!.wealthGenerated).toBeCloseTo(gain(288), 4);
  });

  test('a CD held as its own account: the same rule, $3,230', () => {
    const cd = { asset_id: 'cd', label: 'KEY BANK CD', institution: 'Key Bank', kind: 'cd', tax_bucket: 'TAXABLE', balance: VALUE,
      coupon_rate: 0.0385, maturity_date: '2026-08-24', positions: [] };
    const f = thePerformance({ windowStart: windowStartKey('1Y', [T], T), windowLabel: '1 year', today: T, holdings: [], priceOf: () => null,
      transactions: [], snapshotDays: [buildDayFromAccounts([cd] as any, T, `${T}T09:00:00Z`)], investmentAccountIds: new Set(['cd']), accounts: [cd] });
    expect(f.walk!.wealthGenerated).toBeCloseTo(gain(288), 6);
    expect(f.cumulative).toBeCloseTo(Math.pow(1.0385, 288 / 365) - 1, 12);
  });
});

// ═══ Item 6 ════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('item 6 · the account cards share each printed line of the total (MK-XS-F-194 partsShown)', () => {
  const TODAY = '2026-10-10';
  const day = (date: string, values: Record<string, number>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
  const linked = (id: string, balance: number) => ({ asset_id: id, label: id, kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE',
    source: 'connected', balance, cash_balance: 0, positions: [], target_return: 0.06 });
  function cards(days: any[], accounts: any[], transactions: any[], w: string) {
    const ids = accounts.map((a) => String(a.asset_id));
    const windowStart = windowStartKey(w, days.map((d) => d.date), TODAY);
    const p = (s: string[]) => thePerformance({ windowStart, windowLabel: w, today: TODAY, transactions, snapshotDays: days, investmentAccountIds: new Set(s), accounts });
    const all = p(ids);
    return { total: walkShown(all.walk!), shown: accountWalksShown(ids.map((id) => p([id]).walk), all.walk) };
  }
  const LINES = ['beginning', 'contributions', 'withdrawals', 'dividends', 'interest', 'marketChange', 'wealthGenerated', 'ending'] as const;

  test('three accounts $1,000.40 → $1,100.80: $303 against $301 becomes $100 + $101 + $100 = $301', () => {
    const { total, shown } = cards([day('2026-07-09', { A: 1000.4, B: 1000.4, C: 1000.4 })], [linked('A', 1100.8), linked('B', 1100.8), linked('C', 1100.8)], [], '3M');
    expect([total.beginning, total.wealthGenerated, total.ending]).toEqual([3001, 301, 3302]);
    expect(shown.map((s) => s!.beginning)).toEqual([1001, 1000, 1000]);
    expect(shown.map((s) => s!.ending)).toEqual([1101, 1101, 1100]);
    expect(shown.map((s) => s!.wealthGenerated)).toEqual([100, 101, 100]);
    // each card adds up on its own: beginning + money in − money out + wealth generated = ending
    for (const s of shown) expect(s!.beginning + s!.contributions - s!.withdrawals + s!.wealthGenerated).toBe(s!.ending);
    for (const s of shown) expect(s!.dividends + s!.interest + s!.marketChange).toBe(s!.wealthGenerated);
  });

  test('ten households with cents, every window: each line of the cards adds up exactly to the same line of the total', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let checked = 0;
    for (let h = 0; h < 10; h += 1) {
      const n = 2 + Math.floor(rnd() * 4);
      const ids = Array.from({ length: n }, (_, i) => `acc${i}`);
      const start = Object.fromEntries(ids.map((id) => [id, Math.round(rnd() * 500_000) / 100]));
      const accounts = ids.map((id) => linked(id, Math.round((start[id] * (0.8 + rnd() * 0.5)) * 100) / 100 + 0.37));
      const tx = rnd() > 0.5 ? [{ type: 'DEPOSIT', account_id: ids[0], date: '2026-09-15', amount: Math.round(rnd() * 100_000) / 100 },
        { type: 'WITHDRAWAL', account_id: ids[n - 1], date: '2026-09-20', amount: Math.round(rnd() * 10_000) / 100 }] : [];
      for (const w of ['1M', '3M', '6M', 'YTD', '1Y']) {
        const { total, shown } = cards([day('2025-09-01', start)], accounts, tx, w);
        for (const k of LINES) expect([h, w, k, shown.reduce((t, s) => t + (s ? s[k] : 0), 0)]).toEqual([h, w, k, total[k]]);
        checked += 1;
      }
    }
    expect(checked).toBe(50);                                          // 10 households × 5 windows, every one looked at
  });

  test('no walk on a card gives no card lines; no total leaves each card its own share', () => {
    expect(accountWalksShown([null, undefined], null)).toEqual([null, null]);
  });
});

// ═══ WORKPLAN ROW 435 (2026-11-13) ════════════════════════════════════════════════════════════════════════════════════════
// The account page's walk ends at the account's own value. Three accounts $1,000.40 → $1,100.80: the cards share the total's dollars
// ($1,101 + $1,101 + $1,100 = $3,302), so account C's card ends $1,100 while its value line reads $1,101 (1,100.80 rounded). By hand,
// C's page: beginning $1,000 (as its card), ending $1,101, the dollar on the last line — change in investment value $100 + $1 = $101.
describe('row 435 · MK-NW-F-416 walkEndingAtOwnValue — the account page\'s walk ends at the account\'s own value', () => {
  const card = { beginning: 1000, contributions: 0, withdrawals: 0, dividends: 0, interest: 0, marketChange: 100, wealthGenerated: 100, ending: 1100 };
  const own = { beginning: 1000, contributions: 0, withdrawals: 0, dividends: 0, interest: 0, marketChange: 101, wealthGenerated: 101, ending: 1101 };
  test('account C: card $1,000 → $1,100, own ending $1,101 → page $1,000 → $1,101, change in value $101, and the walk adds up', () => {
    const w = walkEndingAtOwnValue(card, own);
    expect([w.beginning, w.marketChange, w.wealthGenerated, w.ending]).toEqual([1000, 101, 101, 1101]);
    expect(w.beginning + w.contributions - w.withdrawals + w.dividends + w.interest + w.marketChange).toBe(w.ending);
  });
  test('where the card already ends at the account\'s own value, its lines stand as they are (accounts A and B)', () => {
    const a = { ...card, beginning: 1001, ending: 1101 };
    expect(walkEndingAtOwnValue(a, own)).toBe(a);
  });
});

// ═══ DEC-10558 ═════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('DEC-10558 · a window starts from its last close however old, and the sentence states its date', () => {
  const T = '2026-09-30';
  const acct = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000, derive_balance: true,
    positions: [{ position_id: 'v', ticker: 'VTI', label: 'VTI', lots: [{ lot_id: 'l', shares: 100, cost_per_share: 50, purchase_date: '2023-01-02' }] }] };
  const series = { ticker: 'VTI', points: [{ date: '2024-08-01', close: 70 }, { date: '2026-09-29', close: 99 }, { date: T, close: 100 }] };
  const windowOf = (w: string) => {
    const rows = buildPerformance(acct.positions as any, () => series, w as any, new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts: [acct] });
    return thePerformance({ windowStart: windowStartKey(w, [], T), windowLabel: w, today: T, holdings: rows as any, priceOf: () => series,
      transactions: [], snapshotDays: [{ date: T, accounts: [{ date: T, accountId: 'van', cash: 0, statedTotal: 10_000, currency: 'USD' }], holdings: [] }],
      investmentAccountIds: new Set(['van']), accounts: [acct] });
  };
  test('1 year: left out before; +42.86% now (100 ÷ 70 − 1), Wealth generated $3,000 on a $7,000 beginning', () => {
    const f = windowOf('1Y');
    expect(f.cumulative).toBeCloseTo(100 / 70 - 1, 12);
    expect(f.walk!.wealthGenerated).toBeCloseTo(3_000, 6);
    expect(f.walk!.beginning).toBeCloseTo(7_000, 6);
  });
  test.each([['1M'], ['YTD'], ['1Y']])('%s: the sentence names the close and says the return covers more than the window', (w) => {
    expect(windowOf(w).notIncluded).toBe('VTI’s starting price is its last close before the window, Aug 1, 2024, so its return runs from that day and covers more than the window.');
  });
  test('a close at most 7 days before the start says nothing (START_CLOSE_DAYS decides only when the date is said)', () => {
    const fresh = { ticker: 'VTI', points: [{ date: '2025-09-26', close: 70 }, { date: T, close: 100 }] };
    const rows = buildPerformance(acct.positions as any, () => fresh, '1Y', new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts: [acct] });
    const f = thePerformance({ windowStart: windowStartKey('1Y', [], T), windowLabel: '1Y', today: T, holdings: rows as any, priceOf: () => fresh,
      transactions: [], snapshotDays: [], investmentAccountIds: new Set(['van']), accounts: [acct] });
    expect(f.cumulative).toBeCloseTo(100 / 70 - 1, 12);
    expect(f.notIncluded).toBe('');
  });
});
