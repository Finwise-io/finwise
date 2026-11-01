/** FX-PF, 2026-10-27 — the Performance fixes of the drawing match of 2026-10-27 (round 2) and the open workplan rows, each held on the
 *  screen or the store path production uses. Every expected figure is worked by hand beside it.
 *
 *   NW2-18  an option bought before 2026-10-23 (no shares per contract on its record), read from STORED OLD-SHAPE DATA on its way in
 *   #293    a purchase changed or removed in the holding editor changes or removes its record (and Delete holding)
 *   #294    a second file imported into the same account is read against the first file's records
 *   PF-6    Look back's two amounts at 700 (Look back v01, approved 2026-10-02, DEC-1069)
 *   NW2-26  Look back's apostrophes are the curly ’
 *   NW2-23  the Holding page starts 20 under the top bar
 *   PF-8    one name per account on the Holding page, the holding editor and the activity sheet (DEC-0083)
 *   PF-10   "This year" on the Holding page, never "past year so far"
 *   PF-9    one space before ⚠ on the trade sheet
 *   Q49     the concentration notices print two decimals, from a share kept whole (MK-PF-F-015)
 *   —       "5,000 shares" on the Holding page
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { buildInsights } from '../../domain/insights';
import { topHoldingConcentration } from '../../domain/performance';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const texts = () => {
  const out: { t: string; style: any }[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push({ t, style: StyleSheet.flatten(n.props?.style) ?? {} }); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};
beforeEach(() => { mockParams = {}; useStore.getState().resetAll(); useStore.setState({ hideBalances: false } as any); });

// ═══ NW2-18 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fidelity Brokerage, built by hand from its holdings: $1,000 of cash, then 1 SPX call bought on 2026-10-20 at $2.50 a share — saved
// before 2026-10-23, so its record carries no shares per contract and the cash moved $2.50: $997.50 stored. The option is 100 a
// contract (its holding says nothing else: DEC-0274). By hand: 1 × $2.50 × 100 = $250 should have moved; $250 − $2.50 = $247.50 more,
// so the cash reads $997.50 − $247.50 = $750.00, and the activity line −$250.
const OLD_SHAPE = () => ({
  assetAccounts: [{ asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true,
    cash_balance: 997.5, balance: 997.5 + 250,
    positions: [{ position_id: 'spx', ticker: 'SPX', kind: 'options', lots: [{ lot_id: 'o1', shares: 1, cost_per_share: 2.5, purchase_date: '2026-10-20' }] }] }],
  transactions: [{ id: 't-old', date: '2026-10-20', type: 'BUY', account_id: 'fid', ticker: 'SPX', shares: 1, price: 2.5, created_at: '2026-10-20T10:00:00Z' }],
  priceCache: {},
});
describe('NW2-18 · an option bought before 2026-10-23 reads $250, from the data stored before', () => {
  test('the phone\'s own copy on its way in: the record takes 100 shares a contract, the cash $997.50 → $750.00, once', () => {
    const merge = (useStore as any).persist.getOptions().merge;
    const once = merge(OLD_SHAPE(), useStore.getState());
    expect(once.transactions[0].multiplier).toBe(100);
    expect(once.assetAccounts[0].cash_balance).toBeCloseTo(750, 9);
    // the account built from its holdings adds up again: $750 + 1 × $2.50 × 100 (no price: what was paid) = $1,000
    expect(once.assetAccounts[0].balance).toBeCloseTo(1_000, 9);
    const twice = merge(once, useStore.getState());
    expect([twice.transactions[0].multiplier, twice.assetAccounts[0].cash_balance]).toEqual([100, once.assetAccounts[0].cash_balance]);
  });
  test('the cloud copy on its way in moves the same way', () => {
    useStore.getState().loadFromCloud(OLD_SHAPE() as any);
    const s = useStore.getState() as any;
    expect([s.transactions[0].multiplier, s.assetAccounts[0].cash_balance]).toEqual([100, 750]);
  });
  test('the activity sheet reads "Buy SPX · 1 contract @ $2.50" beside −$250 (it read −$2)', () => {
    const merged = (useStore as any).persist.getOptions().merge(OLD_SHAPE(), useStore.getState());
    useStore.setState({ assetAccounts: merged.assetAccounts, transactions: merged.transactions } as any);
    const { HistorySheet } = require('../PerformanceScreen');
    const s = useStore.getState() as any;
    render(<HistorySheet open transactions={s.transactions} accounts={s.assetAccounts} onClose={() => {}} onDelete={() => true} />);
    const t = texts().map((x) => x.t);
    expect(t).toContain('Buy SPX · 1 contract @ $2.50');
    expect(t).toContain('−$250');
    expect(t).not.toContain('−$2');
  });
  test('a linked account\'s record and cash are the broker\'s: untouched', () => {
    const d = OLD_SHAPE(); (d.assetAccounts[0] as any).source = 'connected';
    const once = (useStore as any).persist.getOptions().merge(d, useStore.getState());
    expect([once.transactions[0].multiplier, once.assetAccounts[0].cash_balance]).toEqual([undefined, 997.5]);
  });
});

// ═══ #293 ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Vanguard, built by hand: 10 VTI added on Jan 5, 2026 at $90.00 — its record "Opening holding 10 @ $90.00".
const VTI = () => ({ position_id: 'v', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'a', shares: 10, cost_per_share: 90, purchase_date: '2026-01-05' }] });
const opening = () => (useStore.getState() as any).transactions.filter((t: any) => t.type === 'OPENING_POSITION');
describe('#293 · the holding editor\'s purchase records follow the purchase', () => {
  beforeEach(() => {
    useStore.setState({ assetAccounts: [{ asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, cash_balance: 0, balance: 900, positions: [] }] } as any);
    useStore.getState().addPosition('van', VTI() as any);
  });
  const pos = () => (useStore.getState() as any).assetAccounts[0].positions[0];
  test('changed: $90.00 → $95.00 rewrites its record to $95.00 (it stayed $90.00); one record, never two', () => {
    expect(opening().map((t: any) => [t.shares, t.price, t.lot_id])).toEqual([[10, 90, 'a']]);
    useStore.getState().updatePosition('van', pos().position_id, { lots: [{ lot_id: 'a', shares: 10, cost_per_share: 95, purchase_date: '2026-01-05' }] } as any);
    expect(opening().map((t: any) => [t.date, t.shares, t.price])).toEqual([['2026-01-05', 10, 95]]);
  });
  test('removed: a second purchase added, then removed — its record goes, the first stays', () => {
    useStore.getState().updatePosition('van', pos().position_id, { lots: [...pos().lots, { lot_id: 'b', shares: 5, cost_per_share: 100, purchase_date: '2026-02-02' }] } as any);
    expect(opening().map((t: any) => t.lot_id).sort()).toEqual(['a', 'b']);
    useStore.getState().updatePosition('van', pos().position_id, { lots: [pos().lots[0]] } as any);
    expect(opening().map((t: any) => [t.lot_id, t.shares, t.price])).toEqual([['a', 10, 90]]);
  });
  test('a record written before 2026-10-27 (no purchase id) is found by its date, shares and price, and rewritten', () => {
    useStore.setState({ transactions: opening().map(({ lot_id: _gone, ...t }: any) => t) } as any);
    useStore.getState().updatePosition('van', pos().position_id, { lots: [{ lot_id: 'a', shares: 12, cost_per_share: 90, purchase_date: '2026-01-05' }] } as any);
    expect(opening().map((t: any) => [t.shares, t.price, t.lot_id])).toEqual([[12, 90, 'a']]);
  });
  test('Delete holding takes its opening records; a recorded buy of it stays (it moved cash)', () => {
    useStore.getState().recordTransaction({ date: daysAgo(3), type: 'BUY', account_id: 'van', ticker: 'VTI', shares: 1, price: 100 } as any);
    useStore.getState().deletePosition('van', pos().position_id);
    const left = (useStore.getState() as any).transactions;
    expect(left.filter((t: any) => t.type === 'OPENING_POSITION')).toHaveLength(0);
    expect(left.filter((t: any) => t.type === 'BUY')).toHaveLength(1);
  });
});

// ═══ #294 ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('#294 · a second file is read against the records the first file wrote', () => {
  const file = (shares: number, cost: number) => [{ position_id: `p${cost}`, ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: `l${cost}`, shares, cost_per_share: cost, purchase_date: '' }] }];
  beforeEach(() => {
    useStore.getState().addAsset({ label: 'Imported', kind: 'brokerage', asset_class: 'stocks_etf', balance: 8_000, positions: file(100, 80), derive_balance: true } as any);
  });
  const id = () => (useStore.getState() as any).assetAccounts[0].asset_id;
  test('100 VTI at $80.00 ($8,000), then a file of 100 at $90.00: one record, 100 @ $90.00 ($9,000) — it kept $8,000', () => {
    expect(opening().map((t: any) => [t.shares, t.price])).toEqual([[100, 80]]);
    useStore.getState().updateAsset(id(), { positions: file(100, 90) } as any);
    expect(opening().map((t: any) => [t.shares, t.price, t.position_id])).toEqual([[100, 90, 'p90']]);
  });
  test('the same file twice: still one record of 100 — a purchase is never counted twice', () => {
    useStore.getState().updateAsset(id(), { positions: file(100, 80) } as any);
    expect(opening().map((t: any) => [t.shares, t.price])).toEqual([[100, 80]]);
  });
  test('a buy of 10 recorded between: a file of 110 rewrites the opening to 110 − 10 = 100, and the buy stays', () => {
    useStore.getState().recordTransaction({ date: daysAgo(2), type: 'BUY', account_id: id(), ticker: 'VTI', shares: 10, price: 100 } as any);
    useStore.getState().updateAsset(id(), { positions: file(110, 81.82) } as any);
    expect(opening().map((t: any) => t.shares)).toEqual([100]);
    expect((useStore.getState() as any).transactions.filter((t: any) => t.type === 'BUY').map((t: any) => t.shares)).toEqual([10]);
  });
});

// ═══ The Holding page: NW2-23, PF-8, PF-10, 5,000 shares ═════════════════════════════════════════════════════════════
describe('the Holding page', () => {
  const HOUSE = () => {
    const now = new Date();
    const pts = [{ date: iso(new Date(now.getFullYear() - 1, 0, 2)), close: 80 }, { date: iso(new Date(now.getFullYear(), 0, 1)), close: 90 }, { date: iso(now), close: 99 }];
    useStore.setState({
      assetAccounts: [{ asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', derive_balance: true, cash_balance: 0, balance: 495_000,
        positions: [{ position_id: 'v', ticker: 'VTI', label: 'Vanguard Total Stock Market', kind: 'stocks_etf', lots: [{ lot_id: 'a', shares: 5000, cost_per_share: 70, purchase_date: '2024-03-01' }] }] }],
      priceCache: { VTI: { ticker: 'VTI', points: pts }, SPY: { ticker: 'SPY', points: pts.map((p) => ({ ...p, close: p.close * 5 })) } },
      pricesFetchedAt: new Date().toISOString(),
    } as any);
    mockParams = { account: 'van', position: 'v', period: 'YTD' };
  };
  test('NW2-23: the page starts 20 under the top bar, on every side (it was 24 at the top)', () => {
    HOUSE();
    const Holding = require('../HoldingDetailScreen').default;
    render(<Holding />);
    const scrolls = screen.UNSAFE_root.findAll((n: any) => n.props?.contentContainerStyle != null);
    expect(scrolls.length).toBeGreaterThanOrEqual(1);
    const c = StyleSheet.flatten(scrolls[0].props.contentContainerStyle);
    expect([c.padding, c.paddingTop ?? c.padding]).toEqual([20, 20]);
  });
  test('PF-8: "in Vanguard Brokerage", the account page\'s name (it read "in Vanguard"); 5,000 shares with its comma (it read 5000)', () => {
    HOUSE();
    const Holding = require('../HoldingDetailScreen').default;
    render(<Holding />);
    const t = texts().map((x) => x.t);
    expect(t).toContain('in Vanguard Brokerage');
    expect(t).not.toContain('in Vanguard');
    expect(t).toContain('5,000 shares');
    expect(t.some((x) => /\b5000\b/.test(x))).toBe(false);
  });
  test('PF-10: YTD picked reads "Your return, this year" — "This year", the tab\'s word (it read "past year so far")', () => {
    HOUSE();
    const Holding = require('../HoldingDetailScreen').default;
    render(<Holding />);
    const t = texts().map((x) => x.t);
    expect(t).toContain('Your return, this year');
    expect(t.some((x) => /year so far/.test(x))).toBe(false);
  });
});

// ═══ PF-8 in the holding editor, PF-9 on the trade sheet ═════════════════════════════════════════════════════════════
describe('the sheets', () => {
  const ACCT = { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 40_000, cash_balance: 1_000,
    positions: [{ position_id: 'v', ticker: 'VTI', kind: 'stocks_etf', last_price: 300, lots: [{ lot_id: 'a', shares: 10, cost_per_share: 200, purchase_date: '2024-03-01' }] }] };
  test('PF-8: the holding editor\'s Account chip and its 📊 line say "Vanguard Brokerage"', () => {
    const { HoldingEditor } = require('../PerformanceScreen');
    render(<HoldingEditor open accounts={[ACCT]} existing={{ accountId: 'van', position: ACCT.positions[0] }} onClose={() => {}} onSave={() => {}} />);
    const t = texts().map((x) => x.t);
    expect(t).toContain('Vanguard Brokerage');
    expect(t.find((x) => x.startsWith('📊'))).toBe('📊 Tracked for performance — this won’t change Vanguard Brokerage’s $40,000 total. Edit the account total in Net worth.');
    expect(screen.getByLabelText('Account: Vanguard Brokerage')).toBeOnTheScreen();
  });
  test('PF-9: one space before ⚠ — "You own 10 shares ⚠ can’t sell more than you own"', () => {
    const { TransactionSheet } = require('../PerformanceScreen');
    render(<TransactionSheet open accounts={[ACCT]} onClose={() => {}} onSave={() => {}} prefill={{ accountId: 'van', ticker: 'VTI' }} />);
    fireEvent.press(screen.getByLabelText('Transaction type: Sell'));
    fireEvent.press(screen.getByLabelText('Holding: VTI'));
    fireEvent.changeText(screen.getAllByLabelText(/^(Shares|Contracts|Price per share|Amount)$/)[0], '12');   // the Shares box, the first of the two
    const line = texts().map((x) => x.t).find((x) => x.startsWith('You own'));
    expect(line).toBe('You own 10 shares ⚠ can’t sell more than you own');
  });
});

// ═══ PF-6 and NW2-26: Look back ══════════════════════════════════════════════════════════════════════════════════════
describe('Look back', () => {
  test('NW2-26: "What if I’d …" with the curly ’; PF-6: "$20,500" and "$23,200" at 700 as v01 draws them (they were 800)', async () => {
    const now = new Date();
    const yr = (d: number) => iso(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + d));
    useStore.setState({
      priceCache: { BND: { ticker: 'BND', points: [{ date: yr(-3), close: 100 }, { date: iso(now), close: 102.5 }] },
        SPY: { ticker: 'SPY', points: [{ date: yr(-3), close: 100 }, { date: iso(now), close: 116 }] } },
      pricesFetchedAt: new Date().toISOString(),
    } as any);
    mockParams = { from: 'BND', to: 'SPY', amount: '20000' };
    const LookBack = require('../LookBackScreen').default;
    render(<LookBack />);
    await waitFor(() => expect(texts().some((x) => x.t.startsWith('Left in BND it became'))).toBe(true));
    const t = texts();
    expect(t.map((x) => x.t)).toContain('What if I’d moved money 12 months ago?');
    // $20,000 × 102.5 ÷ 100 = $20,500; × 116 ÷ 100 = $23,200
    for (const amt of ['$20,500', '$23,200']) {
      const strong = screen.UNSAFE_root.findAll((n: any) => n.type === 'Text' && n.props?.children === amt);
      expect(strong.length).toBeGreaterThanOrEqual(1);
      expect(StyleSheet.flatten(strong[0].props.style).fontWeight).toBe('700');
    }
  });
  test('the drawing carries both corrections on a dated row of 2026-10-27, in single marks (his words only in “…”)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_look-back_v01.html'), 'utf8');
    const rows = html.split('<tr>').filter((r) => r.includes('2026-10-27') && (r.includes('(PF-6)') || r.includes('(NW2-26)')));
    expect(rows).toHaveLength(2);
    // his words alone in “…”: the screen's words and the lead's are in ‘…’ (the rule of 2026-10-27, 14:45)
    for (const r of rows) {
      expect(r).toMatch(/Approved before:[\s\S]*His feedback:[\s\S]*New:/);
      expect([...r.matchAll(/“([^”]*)”/g)].map((m) => m[1]).sort()).toEqual(['approved.', 'make sure font size and color and overall design are same across all screens.']);
    }
  });
});

// ═══ Q49 · the concentration notices ═════════════════════════════════════════════════════════════════════════════════
describe('Q49 · MK-PF-F-015 keeps the share whole; the notice prints two decimals', () => {
  test('41,250.17 ÷ 95,617 = 43.14%: "$41,250 (43.14%) of your invested money rides on one holding (VTI)" — it printed (43%)', () => {
    const row = (ticker: string, v: number) => ({ position: { ticker, position_id: ticker, lots: [] }, marketValue: v } as any);
    const top = topHoldingConcentration([row('VTI', 41_250.17), row('BND', 30_000), row('VXUS', 95_617 - 41_250.17 - 30_000)])!;
    expect(top.pct).toBeCloseTo((41_250.17 / 95_617) * 100, 12);
    const ins = buildInsights({ cashMonths: 6, toxicDebt: null, k401Remaining: 0, hasEarnedIncome: true, retireChance: 90, topAccountPct: 20, planPct: 100, beatBy: 0.01, investRate: 0.2, topHolding: top } as any);
    expect(ins.find((i) => i.id === 'holding-concentration')!.body).toBe('$41,250 (43.14%) of your invested money rides on one holding (VTI) — a fact worth knowing, not advice.');
  });
});
