/** THE HOLDING PAGE'S GAINS IF SOLD TODAY, AND WHAT WAS PAID — five defects of 2026-10-21 (the outside re-run of Performance,
 *  OpenAI parts 2 and tax, and the lead), each decided by the lead without asking him and drawn first as a dated READ THIS
 *  FIRST row on holding-detail v02. Worked examples are the rows' own.
 *
 *  1. A purchase with NO PURCHASE DATE ON RECORD is in neither the long-term nor the short-term part (tenet 3, DEC-3523): a
 *     missing date was read as 1 January 1970 (long-term), a blank or impossible one as short-term.
 *  2. Inside an account taxed as PRE-TAX OR TAX-FREE (401(k), Traditional IRA, Roth IRA, Roth 401(k), HSA, 529) the gain is
 *     shown whole — a sale there is not taxed as a capital gain (tenet 7; IRS Publication 550).
 *  3. An OPTION ON A BROAD-BASED INDEX is split 60% long-term / 40% short-term whatever the holding period (IRS Publication
 *     550, the 60/40 rule of section 1256; DEC-0378). One list of those indexes.
 *  4. A stored $0 price paid is read ONE way on the page: with no live price, the large figure is Total paid (DEC-6627).
 *  5. An imported holding with no purchase date in the file keeps it as not on record — it was given the day of the import.
 *  And the spoken words read their percents through the same two-decimal formatter as the figures on screen (Q49). */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import HoldingDetailScreen from '../HoldingDetailScreen';
import ImportHoldingsScreen from '../ImportHoldingsScreen';
import {
  capGains, paidOnRecord, buildPerformance, purchaseDateOnRecord, isBroadIndexOption, earliestPurchaseDate,
  SECTION_1256_INDEX_OPTION_ROOTS, SECTION_1256_LONG_TERM_PERCENT, type Position,
} from '../../domain/performance';
import { importHoldings } from '../../domain/import/holdingsImport';
import { HELD_IN_CHOICES, wrapperAccount } from '../../domain/assets';
import {
  theHolding, undatedGainSentence, SECTION_1256_LINE, NOT_CAPITAL_GAINS_LINE,
} from '../../../MoneyKeel/functions/networth-and-performance/holding';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const at = (day: string) => jest.useFakeTimers({ now: new Date(`${day}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
afterEach(() => { jest.useRealTimers(); mockParams = {}; });
const NOON = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });

// phone A of holding-detail v02, on the drawing's own day (Oct 1, 2026): 100 AAPL bought Mar 14, 2023 at $168.00 and 40 at
// $192.50, today $241.84; the market (SPY) $500 → $612 over the past year
const SPY = series('SPY', [['2024-08-01', 400], ['2025-09-30', 500], ['2025-10-01', 500], ['2026-04-01', 560], ['2026-09-30', 610], ['2026-10-01', 612]]);
const AAPL = series('AAPL', [['2024-08-01', 150], ['2025-09-30', 175], ['2025-10-01', 175], ['2026-04-01', 210], ['2026-09-30', 239.53], ['2026-10-01', 241.84]]);
const phoneA = (secondDate: string) => ({ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
  { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' },
  { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: secondDate }] });
const account = (positions: any[], extra: any = {}) => ({ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions, ...extra });

function open(acct: any, prices: Record<string, any>) {
  mockParams = { account: acct.asset_id, position: acct.positions[0].position_id };
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [acct], transactions: [], priceCache: prices,
    pricesFetchedAt: new Date().toISOString() } as any);
  render(<HoldingDetailScreen />);
}
/** Every visible line of the rendered screen, in order. */
function lines(): string[] {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
/** The IF YOU SOLD TODAY card's lines, from its band to the buttons under it. */
const soldToday = () => { const L = lines(); const i = L.indexOf('IF YOU SOLD TODAY'); expect(i).toBeGreaterThan(0); return L.slice(i, L.indexOf('Record buy/sell')); };

// ═══ 1 · NO PURCHASE DATE ON RECORD ═════════════════════════════════════════════════════════════════════════════════
describe('1 · a purchase with no purchase date on record is in neither part', () => {
  test('the one reading of a purchase date: a real calendar day written year-month-day, or none', () => {
    const cases: [string | null | undefined, string | null][] = [
      ['2023-03-14', '2023-03-14'], ['2024-02-29', '2024-02-29'], ['2023-04-01T00:00:00Z', '2023-04-01'],
      ['2026-02-31', null], ['2025-02-29', null], ['2026-13-01', null], ['', null], [null, null], [undefined, null],
      ['04/01/2023', null], ['2023-4-1', null],
    ];
    for (const [given, want] of cases) expect([given, purchaseDateOnRecord(given)]).toEqual([given, want]);
    expect(cases).toHaveLength(11);   // a guard proves it looked
    // the same reading decides where "since purchase" begins
    expect(earliestPurchaseDate({ position_id: 'p', ticker: 'X', lots: [
      { lot_id: 'a', shares: 1, cost_per_share: 1, purchase_date: '2026-02-31' }, { lot_id: 'b', shares: 1, cost_per_share: 1, purchase_date: '2026-03-05' }] } as Position)).toBe('2026-03-05');
  });

  test('worked example 1: 3.25 mini-option contracts at $2.37, no date, today $4.13 → $57.20 in neither part, on its own line', () => {
    for (const date of [null, '', '2026-02-31']) {
      const p = { position_id: 'o', ticker: 'XYZ', kind: 'options', multiplier: 10,
        lots: [{ lot_id: 'l', shares: 3.25, cost_per_share: 2.37, purchase_date: date }] } as any;
      const cg = capGains(p, 4.13, NOON('2026-10-13'));
      expect([cg.longGain, cg.shortGain]).toEqual([null, null]);           // was long-term $57.20 (null) or short-term (blank)
      expect(cg.totalGain!).toBeCloseTo(57.2, 9);                           // 3.25 × 10 × ($4.13 − $2.37)
      expect(cg.undated!.gain!).toBeCloseTo(57.2, 9);
      expect(undatedGainSentence({ gain: cg.undated!.gain!, counted: cg.undated!.counted }, p, (n) => `$${Math.round(n)}`))
        .toBe('$57 gain on 3.25 contracts whose purchase date is not on record, so it is neither long-term nor short-term.');
    }
  });

  test('on the page, with no dated purchase: the two gain rows are not drawn and the line carries the gain', () => {
    at('2026-10-01');
    const opt = { position_id: 'p1', ticker: 'XYZ', label: 'XYZ mini call', kind: 'options', multiplier: 10,
      lots: [{ lot_id: 'l1', shares: 3.25, cost_per_share: 2.37, purchase_date: '' }] };
    open(account([opt]), { XYZ: series('XYZ', [['2025-09-30', 3], ['2026-09-30', 4], ['2026-10-01', 4.13]]), SPY });
    expect(soldToday()).toEqual(['IF YOU SOLD TODAY',
      '$57 gain on 3.25 contracts whose purchase date is not on record, so it is neither long-term nor short-term.']);
    expect(lines()).toContain('Date not on record');                       // WHAT YOU BOUGHT: it was blank
    expect(screen.getByLabelText('3.25 contracts at $2.37, purchase date not on record. Opens the editor.')).toBeOnTheScreen();
  });

  test('worked example 2, phone A with the 40 shares\' date missing: long-term +$7,384, and $1,974 on the line — $9,357.60 together', () => {
    at('2026-10-01');
    const cg = capGains(phoneA('') as any, 241.84, NOON('2026-10-01'));
    expect(cg.longGain!).toBeCloseTo(7384, 9);                              // 100 × ($241.84 − $168.00)
    expect(cg.shortGain).toBe(0);
    expect(cg.undated!.gain!).toBeCloseTo(1973.6, 9);                       // 40 × ($241.84 − $192.50)
    expect(cg.totalGain!).toBeCloseTo(9357.6, 9);
    open(account([phoneA('')]), { AAPL, SPY });
    expect(soldToday()).toEqual(['IF YOU SOLD TODAY', 'Gain — long-term (held over 1 yr)', '+$7,384',
      '$1,974 gain on 40 shares whose purchase date is not on record, so it is neither long-term nor short-term.']);
    expect(lines()).toContain('▲ +$9,358 (+38.19%)');                       // the change since purchase is unchanged
  });

  test('a dated holding is unchanged: phone A as drawn reads +$7,384 long-term and +$1,974 short-term, and no line', () => {
    at('2026-10-01');
    open(account([phoneA('2026-01-09')]), { AAPL, SPY });
    expect(soldToday()).toEqual(['IF YOU SOLD TODAY', 'Gain — long-term (held over 1 yr)', '+$7,384', 'Gain — short-term (held 1 yr or less)', '+$1,974']);
  });
});

// ═══ 2 · INSIDE AN ACCOUNT TAXED AS PRE-TAX OR TAX-FREE ══════════════════════════════════════════════════════════════
describe('2 · inside a 401(k), an IRA, a Roth, an HSA or a 529 the gain is shown whole', () => {
  test('every Held in choice: the five tax-advantaged ones have no split, Taxable keeps it; not stated keeps it; a 529 has none', () => {
    const ask = (extra: any) => theHolding({ position: phoneA('2026-01-09') as any, accountId: 'fid', account: account([], extra) as any,
      price: 241.84, transactions: [], now: NOON('2026-10-01') }).notCapitalGains;
    const seen = HELD_IN_CHOICES.map(({ key }) => [key, ask(wrapperAccount(key))]);
    expect(seen).toEqual([['taxable', false], ['401k', true], ['trad_ira', true], ['roth', true], ['roth_401k', true], ['hsa', true]]);
    expect(ask({ kind: 'college_529', tax_bucket: undefined })).toBe(true);
    expect(ask({ kind: undefined, tax_bucket: undefined })).toBe(false);      // tax type not stated: the split stays
    expect(theHolding({ position: phoneA('2026-01-09') as any, accountId: 'fid', price: 241.84, transactions: [] }).notCapitalGains).toBe(false);
  });

  test('worked example: phone A held in a Roth IRA reads Gain +$9,358 and the line — no long-term or short-term row', () => {
    at('2026-10-01');
    open(account([phoneA('2026-01-09')], { kind: 'roth_ira', tax_bucket: 'ROTH' }), { AAPL, SPY });
    expect(soldToday()).toEqual(['IF YOU SOLD TODAY', 'Gain', '+$9,358', NOT_CAPITAL_GAINS_LINE]);
    expect(NOT_CAPITAL_GAINS_LINE).toBe('Gains inside this account are not taxed as capital gains, so they are not split into long-term and short-term.');
  });

  test('the line about purchases with no price paid stays inside a Roth; the date and index-option lines do not show there', () => {
    at('2026-10-01');
    const p = { ...phoneA(''), lots: [...phoneA('').lots, { lot_id: 'l3', shares: 10, cost_per_share: null, purchase_date: '2024-01-02' }] };
    open(account([p], { kind: 'roth_ira', tax_bucket: 'ROTH' }), { AAPL, SPY });
    expect(soldToday()).toEqual(['IF YOU SOLD TODAY', 'Gain', '+$9,358', NOT_CAPITAL_GAINS_LINE,
      '$9,358 gain on 140 of 150 shares; what you paid for the other 10 is not on record.']);
  });
});

// ═══ 3 · AN OPTION ON A BROAD-BASED INDEX ════════════════════════════════════════════════════════════════════════════
describe('3 · an option on a broad-based index is split 60/40 whatever the holding period', () => {
  test('one list of eleven indexes, read from the option\'s ticker; SPY, a single company and a 3× fund are not on it', () => {
    expect([...SECTION_1256_INDEX_OPTION_ROOTS]).toEqual(['SPX', 'SPXW', 'XSP', 'NDX', 'NDXP', 'RUT', 'MRUT', 'VIX', 'DJX', 'OEX', 'XEO']);
    expect(SECTION_1256_LONG_TERM_PERCENT).toBe(60);   // IRS Publication 550 (2025): "60% long-term and 40% short-term"
    const opt = (ticker: string, kind = 'options') => isBroadIndexOption({ ticker, kind } as any);
    const yes = ['SPX', 'SPX  261218C06000000', 'SPXW261218C06000000', 'spx 12/18/2026 6000 c', 'XSP', 'NDX', 'NDXP', 'RUT', 'MRUT', 'VIX', 'DJX', 'OEX', 'XEO'];
    const no = ['SPY  261218C00600000', 'SPY', 'AAPL  261218C00200000', 'SPXL', 'VIXY', 'QQQ', ''];
    expect(yes.filter((t) => !opt(t))).toEqual([]);
    expect(no.filter((t) => opt(t))).toEqual([]);
    expect(opt('SPX', 'stocks_etf')).toBe(false);                               // the index itself is not an option
    expect(yes.length + no.length).toBe(20);
  });

  test('worked example: 2 SPX calls bought Jul 1, 2026 at $50, today $80 → +$3,600 long-term, +$2,400 short-term (was $0 / $6,000)', () => {
    const spx = (date: string | null) => ({ position_id: 'o', ticker: 'SPX', kind: 'options', lots: [{ lot_id: 'l', shares: 2, cost_per_share: 50, purchase_date: date }] }) as any;
    const g = capGains(spx('2026-07-01'), 80, NOON('2026-10-13'));
    expect([g.longGain, g.shortGain, g.totalGain, g.split]).toEqual([3_600, 2_400, 6_000, 'section_1256']);
    expect(g.longGain! + g.shortGain!).toBe(g.totalGain);                       // the two parts add up exactly
    expect(g.undated).toBeUndefined();
    // no date is needed for this split, and a loss splits the same way
    expect([capGains(spx(null), 80, NOON('2026-10-13')).longGain, capGains(spx('2026-07-01'), 45, NOON('2026-10-13')).longGain]).toEqual([3_600, -600]);
    // an option on SPY keeps the holding-period split
    const spy = { ...spx('2026-07-01'), ticker: 'SPY  261218C00600000' };
    expect([capGains(spy, 80, NOON('2026-10-13')).longGain, capGains(spy, 80, NOON('2026-10-13')).shortGain]).toEqual([0, 6_000]);
  });

  test('on the page: the two rows give the share in their brackets, and the line names the law', () => {
    at('2026-10-01');
    const spx = { position_id: 'p1', ticker: 'SPX', label: 'SPX Dec 18 2026 6000 call', kind: 'options',
      lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 50, purchase_date: '2026-07-01' }] };
    open(account([spx]), { SPX: series('SPX', [['2026-07-01', 50], ['2026-09-30', 78], ['2026-10-01', 80]]), SPY });
    expect(soldToday()).toEqual(['IF YOU SOLD TODAY', 'Gain — long-term (60%)', '+$3,600', 'Gain — short-term (40%)', '+$2,400', SECTION_1256_LINE]);
    expect(SECTION_1256_LINE).toBe('An index option\'s gain is taxed 60% long-term and 40% short-term, however long it was held (IRS Publication 550).');
  });
});

// ═══ 4 · WHAT WAS PAID, READ ONE WAY ═════════════════════════════════════════════════════════════════════════════════
describe('4 · a stored $0 price paid is read one way: with no live price, the large figure is Total paid', () => {
  const coins = (lots: any[]) => ({ position_id: 'p1', ticker: 'BTC', label: 'Bitcoin', kind: 'crypto', lots }) as any;
  const HOLDINGS: [string, Position][] = [
    ['all on record', coins([{ lot_id: 'a', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }])],
    ['one with none', coins([{ lot_id: 'a', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }, { lot_id: 'b', shares: 0.25, cost_per_share: null, purchase_date: '2024-08-01' }])],
    ['one stored at $0', coins([{ lot_id: 'a', shares: 0.5, cost_per_share: 56000, purchase_date: '2024-07-02' }, { lot_id: 'b', shares: 0.25, cost_per_share: 0, purchase_date: '2024-08-01' }])],
    ['only one, stored at $0', coins([{ lot_id: 'a', shares: 0.5, cost_per_share: 0, purchase_date: '2024-07-02' }])],
    ['only one, none', coins([{ lot_id: 'a', shares: 0.5, cost_per_share: null, purchase_date: '2024-07-02' }])],
    ['an option, one with none', { position_id: 'o', ticker: 'XYZ', kind: 'options', lots: [{ lot_id: 'a', shares: 2, cost_per_share: 5, purchase_date: '2026-01-02' }, { lot_id: 'b', shares: 1, cost_per_share: null, purchase_date: '2026-01-03' }] } as any],
  ];
  test('six holdings: the large figure, Total paid, the Performance row and paidOnRecord agree on every one', () => {
    const seen = HOLDINGS.map(([name, p]) => {
      const h = theHolding({ position: p, accountId: 'cb', price: null, transactions: [] });
      const row = buildPerformance([p], () => undefined as any, '1Y', new Date())[0];
      return [name, h.value, h.totalPaid, row.costBasis, paidOnRecord(p).paid];
    });
    expect(seen).toEqual([
      ['all on record', 28000, 28000, 28000, 28000],
      ['one with none', 28000, 28000, 28000, 28000],                         // the large figure refused here
      ['one stored at $0', 28000, 28000, 28000, 28000],
      ['only one, stored at $0', null, null, null, null],                   // the large figure read $0 here
      ['only one, none', null, null, null, null],
      ['an option, one with none', 1000, 1000, 1000, 1000],                 // 2 × 100 × $5
    ]);
  });

  test('worked example on the page: 0.5 coins at $56,000.00 and 0.25 with no price paid → $28,000 large, $28,000 Total paid', () => {
    at('2026-10-01');
    open(account([HOLDINGS[1][1]], { asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase' }), {});
    const L = lines();
    expect(L.slice(L.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID'), L.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID') + 2))
      .toEqual(['NO LIVE PRICE — SHOWING WHAT YOU PAID', '$28,000']);
    expect(L[L.indexOf('Total paid') + 1]).toBe('$28,000');
    expect(L).toContain('The average above and the total paid leave out 0.25 coins with no price paid on record.');
  });

  test('a purchase stored at $0 and nothing else: the large figure is never $0', () => {
    at('2026-10-01');
    open(account([HOLDINGS[3][1]], { asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase' }), {});
    const L = lines();
    expect(L[L.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID') + 1]).not.toBe('$0');
    expect(L[L.indexOf('Total paid') + 1]).toBe('No purchase price recorded.');
  });
});

// ═══ 5 · AN IMPORTED HOLDING WITH NO PURCHASE DATE ═══════════════════════════════════════════════════════════════════
describe('5 · an imported holding with no purchase date keeps it as not on record', () => {
  test('the file\'s dates: a real day is kept; none, or a day that does not exist, is no date', () => {
    const r = importHoldings('Symbol,Quantity,Cost Basis,Purchase Date\nVOO,1,400,03/15/2024\nVTI,2,400,02/31/2026\nAAPL,3,450,\n');
    expect(r.holdings.map((h) => [h.symbol, h.date])).toEqual([['VOO', '2024-03-15'], ['VTI', undefined], ['AAPL', undefined]]);
  });

  test('saved: the purchase date is blank, not the day of the import — so it is not short-term and not "since today"', async () => {
    jest.clearAllMocks();
    useStore.getState().resetAll();
    useStore.setState({ assetAccounts: [] } as any);
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://x.csv' }] });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Symbol,Quantity,Cost Basis,Purchase Date\nVOO,1,400,03/15/2024\nAAPL,3,450,\n');
    const { getByText, getByLabelText } = render(<ImportHoldingsScreen />);
    fireEvent.press(getByText('Choose a file'));
    await waitFor(() => expect(getByLabelText('Which institution is this file from')).toBeTruthy());
    fireEvent.changeText(getByLabelText('Which institution is this file from'), 'Fidelity');
    fireEvent.press(getByLabelText(/Import \d+ holdings?/));
    await waitFor(() => expect(useStore.getState().assetAccounts.length).toBe(1));
    const lots = (useStore.getState().assetAccounts[0] as any).positions.map((p: any) => [p.ticker, p.lots[0].purchase_date]);
    expect(lots).toEqual([['VOO', '2024-03-15'], ['AAPL', '']]);           // AAPL was given the day of the import
  });
});

// ═══ THE SPOKEN WORDS ════════════════════════════════════════════════════════════════════════════════════════════════
describe('the spoken words read their percents to two decimals, as the figures on screen', () => {
  test('phone A: 38.19 percent since purchase; 38.19 and 22.40 percent; ahead by 15.79 points (was 38, 38.2, 22.4 and 15.8)', () => {
    at('2026-10-01');
    open(account([phoneA('2026-01-09')]), { AAPL, SPY });
    expect(screen.getByLabelText('Apple Inc., worth $33,858, up $9,358, 38.19 percent since purchase')).toBeOnTheScreen();
    expect(screen.getByLabelText('Versus the stock market, same dates: your return up 38.19 percent, the market up 22.40 percent, you are ahead by 15.79 points')).toBeOnTheScreen();
    expect(screen.getByLabelText('100 shares at $168.00, bought Mar 14, 2023. Opens the editor.')).toBeOnTheScreen();
    expect(screen.getByLabelText('40 shares at $192.50, bought Jan 9, 2026. Opens the editor.')).toBeOnTheScreen();
  });
});
