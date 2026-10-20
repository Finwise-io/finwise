/** THE ACCOUNT-PAGE DRAWING'S FIVE STATES, RUN THROUGH THE BUILT SCREEN (DEC-6212, 2026-10-19).
 *
 *  His words that led to it: "the return listed in the timebar at the top is not accurate for all screens except
 *  StateA. … Rule is to return % should include price change, dividend and interest, so showing 0% return for bond
 *  is not accurate." His word on the recommendation: "approved."
 *
 *  Each state of MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html is seeded
 *  here as data — the account, its records, its daily record and its prices — and the REAL AccountPortfolioScreen
 *  is rendered on the drawing's day (Sep 30, 2026). What the window bar, the summary and the Bonds & CDs rows print
 *  is read off the rendered screen and pinned, so the drawing's figures are the app's own and cannot drift. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const TODAY = '2026-09-30';
const series = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });
const flat100 = series([['2024-09-29', 100], ['2025-09-29', 100], ['2026-04-02', 100], ['2026-08-29', 100], ['2026-09-30', 100]]);

/** A linked account's recorded day: the broker's stated total. */
const linkedDay = (id: string, date: string, total: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, statedTotal: total, currency: 'USD' }],
});
/** A hand-entered account's recorded day: the value typed. */
const typedDay = (id: string, date: string, value: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, typedValue: value, currency: 'USD' }],
});

// ── STATE A · Vanguard Brokerage, linked, record from Oct 1, 2025 ─────────────────────────────────────────────
const VAN = {
  asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 101_000, cash_balance: 2_000, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [
    { position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', last_price: 562.5,
      lots: [{ lot_id: 'v1', shares: 150, cost_per_share: 531.33, purchase_date: '2024-01-02' },
             { lot_id: 'v2', shares: 10, cost_per_share: 600, purchase_date: '2026-04-02' }] },
    { position_id: 'kcd', ticker: '49306SAB2', name: 'KeyBank CD', label: 'KeyBank CD', kind: 'cd', asset_class: 'bond', last_price: 100,
      face_value: 5_000, coupon_rate: 0.04, maturity_date: '2027-03-31',
      lots: [{ lot_id: 'k1', shares: 50, cost_per_share: 100, purchase_date: '2026-04-02' }] },
    { position_id: 'ust', ticker: '91282CGM7', name: 'US Treasury 2028', label: 'US Treasury 2028', asset_class: 'bond', last_price: 100,
      face_value: 4_000, coupon_rate: 0.0425, maturity_date: '2028-02-15',
      lots: [{ lot_id: 'u1', shares: 40, cost_per_share: 100, purchase_date: '2026-04-02' }] },
  ],
};
const r = (id: string, date: string, type: string, amount: number, ticker?: string, extra: any = {}) =>
  ({ id, date, type, amount, account_id: 'van', source: 'connected', ...(ticker ? { ticker } : {}), ...extra });
const VAN_LEDGER = [
  r('i1', '2026-09-30', 'INTEREST', 50, '49306SAB2'), r('i2', '2026-09-30', 'INTEREST', 4),
  r('d1', '2026-09-26', 'DIVIDEND', 400, 'VOO'), r('i3', '2026-08-15', 'INTEREST', 85, '91282CGM7'),
  r('i4', '2026-06-30', 'INTEREST', 50, '49306SAB2'), r('i5', '2026-06-30', 'INTEREST', 3),
  r('d2', '2026-06-26', 'DIVIDEND', 380, 'VOO'),
  r('b1', '2026-04-02', 'BUY', 6_000, 'VOO', { shares: 10, price: 600 }),
  r('b2', '2026-04-02', 'BUY', 5_000, '49306SAB2', { shares: 50, price: 100 }),
  r('b3', '2026-04-02', 'BUY', 4_000, '91282CGM7', { shares: 40, price: 100 }),
  r('c1', '2026-04-01', 'DEPOSIT', 15_000),
  r('i6', '2026-03-31', 'INTEREST', 4), r('d3', '2026-03-26', 'DIVIDEND', 360, 'VOO'),
  r('i7', '2025-12-31', 'INTEREST', 4), r('d4', '2025-12-26', 'DIVIDEND', 360, 'VOO'),
];
const VAN_DAYS = [
  linkedDay('van', '2025-10-01', 80_000), linkedDay('van', '2025-12-31', 85_000),
  linkedDay('van', '2026-03-31', 90_278), linkedDay('van', '2026-04-01', 105_278),
  linkedDay('van', '2026-08-29', 100_000),
];
// VOO's dividend-adjusted closes: +7.67% over the year to today
const VOO = series([['2024-09-29', 460], ['2025-09-29', 562.5 / 1.0767], ['2025-12-31', 545], ['2026-03-31', 590],
  ['2026-04-02', 600], ['2026-08-29', 556], ['2026-09-30', 562.5]]);

// ── STATE B · Muni 2029, a bond built by hand Jun 2, 2026 at $10,000, updated Sep 1 to $10,150, no rate ────────
const MUNI = {
  asset_id: 'muni', label: 'Muni 2029', kind: 'fixed_income', asset_class: 'bonds', balance: 10_150,
  face_value: 10_000, maturity_date: '2029-06-01', source: 'manual', value_as_of: '2026-09-01',
};
const MUNI_DAYS = [typedDay('muni', '2026-06-02', 10_000), typedDay('muni', '2026-09-01', 10_150)];

// ── STATES C and D · Fidelity Brokerage, linked today, no past activity sent ──────────────────────────────────
const FID = {
  asset_id: 'fid', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 50_000, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [
    { position_id: 'vti', ticker: 'VTI', asset_class: 'stock_etf', last_price: 312.5,
      lots: [{ lot_id: 't1', shares: 128, cost_per_share: 250 }] },
    { position_id: 't31', ticker: '912810TM0', name: 'Treasury 2031', label: 'Treasury 2031', asset_class: 'bond', last_price: 100,
      face_value: 10_000, maturity_date: '2031-11-15', lots: [{ lot_id: 't2', shares: 100 }] },
  ],
};
const VTI = series([['2024-09-29', 250], ['2025-09-29', 312.5 / 1.1], ['2025-12-31', 295], ['2026-08-29', 305], ['2026-09-30', 312.5]]);
// state D: the same account once its first day is on the record (the record begins today)
const FID_DAYS_D = [linkedDay('fid', TODAY, 50_000)];

// ── STATE E · US Treasury 4.00% 2030, built by hand Jun 2, 2026 at $9,850 ────────────────────────────────────
const TSY = {
  asset_id: 'tsy30', label: 'US Treasury 4.00% 2030', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 9_850, face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30', source: 'manual', value_as_of: '2026-06-02',
};
const TSY_DAYS = [typedDay('tsy30', '2026-06-02', 9_850)];

type State = { key: string; account: any; ledger: any[]; days: any[]; prices: Record<string, any>; pick: string };
const STATES: State[] = [
  { key: 'A', account: VAN, ledger: VAN_LEDGER, days: VAN_DAYS, prices: { VOO, '49306SAB2': flat100, '91282CGM7': flat100 }, pick: 'SINCE' },
  { key: 'B', account: MUNI, ledger: [], days: MUNI_DAYS, prices: {}, pick: 'SINCE' },
  { key: 'C', account: FID, ledger: [], days: [], prices: { VTI }, pick: 'SINCE' },
  { key: 'D', account: FID, ledger: [], days: FID_DAYS_D, prices: { VTI }, pick: '1Y' },
  { key: 'E', account: TSY, ledger: [], days: TSY_DAYS, prices: {}, pick: 'SINCE' },
];

function strings(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const s = n.replace(/\s+/g, ' ').trim(); if (s) out.push(s); return; }
    if (n.props?.accessibilityLabel) out.push(`@${String(n.props.accessibilityLabel)}`);
    (Array.isArray(n.children) ? n.children : []).forEach(walk);
  };
  const tree = screen.toJSON();
  (Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return out;
}

type Seg = { k: string; v: string; on: boolean; no: boolean };
/** The window bar as the built screen draws it: each button's name, its figure, picked or not, greyed or not. */
function builtBar(): Seg[] {
  return screen.getAllByRole('button')
    .filter((b) => /^Show /.test(String(b.props.accessibilityLabel ?? '')))
    .map((b) => {
      const texts = (b.children as any[]).flatMap(function flat(c: any): string[] {
        return typeof c === 'string' ? [c] : (c?.children ?? []).flatMap(flat);
      });
      return { k: texts[0], v: texts[1], on: !!b.props.accessibilityState?.selected, no: !!b.props.accessibilityState?.disabled };
    });
}
/** The window bar of each state as the drawing draws it, in the order A to E. */
function drawnBars(): Seg[][] {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance',
    'moneykeel_pres_mock_account-page_v01.html'), 'utf8');
  return [...html.matchAll(/<div class="segbar">([\s\S]*?)<\/div>/g)].map((m) =>
    [...m[1].matchAll(/<span class="(sg[^"]*)"><span class="k">([^<]*)<\/span><span class="v">([^<]*)<\/span><\/span>/g)]
      .map((x) => ({ k: x[2], v: x[3], on: /\bon\b/.test(x[1]), no: /\bno\b/.test(x[1]) })));
}

function renderState(st: State) {
  useStore.getState().resetAll();
  mockParams = { id: st.account.asset_id };
  useStore.setState({ hideBalances: false, assetAccounts: [st.account], transactions: st.ledger,
    snapshotDays: st.days, priceCache: st.prices } as any);
  render(<AccountPortfolioScreen />);
  if (st.pick !== 'SINCE') {
    const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${st.pick}`));
    fireEvent.press(btn!);
  }
}
/** The trio's Return, as printed. */
const trioReturn = (lines: string[]) => lines[lines.indexOf('Return') + 1];

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

/** Every button of every state, as the app prints it on Sep 30, 2026 with that state's data. */
const BARS: Record<string, [string, string, 'on' | 'no' | ''][]> = {
  A: [['Since Oct 1, 2025', '+8.26%', 'on'], ['1M', '+1.00%', ''], ['This year', '+1.89%', ''], ['1Y', '+7.12%', ''], ['2Y', '+9.57%', '']],
  B: [['Since Jun 2, 2026', '+1.50%', 'on'], ['1M', '+1.50%', ''], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
  C: [['Since today', '—', 'on'], ['1M', '—', 'no'], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
  // Since today is never greyed (2026-10-19): state C draws it picked with a dash, state D at rest with a dash, and it can be picked
  D: [['Since today', '—', ''], ['1M', '+2.46%', ''], ['This year', '+5.93%', ''], ['1Y', '+10.00%', 'on'], ['2Y', '+11.79%', '']],
  E: [['Since Jun 2, 2026', '+0.00%', 'on'], ['1M', '+0.00%', ''], ['This year', '—', 'no'], ['1Y', '—', 'no'], ['2Y', '—', 'no']],
};
const asSegs = (k: string): Seg[] => BARS[k].map(([kk, v, st]) => ({ k: kk, v, on: st === 'on', no: st === 'no' }));

describe('the window bar of every state is the app\'s own figure (DEC-6212)', () => {
  const drawn = drawnBars();
  test('the drawing has five bars, five buttons each, and each state\'s summary Return is its picked button', () => {
    expect(drawn.length).toBe(5);
    drawn.forEach((b) => expect(b.length).toBe(5));
    const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance',
      'moneykeel_pres_mock_account-page_v01.html'), 'utf8');
    const trio = [...html.matchAll(/<div class="tl">Return<\/div><div class="tv[^"]*">([^<]*)</g)].map((m) => m[1]);
    expect(trio).toEqual(drawn.map((b) => b.find((x) => x.on)!.v));
  });
  test.each(STATES.map((st, i) => [st.key, st, i] as const))('state %s: built bar = the figures above = the drawing\'s bar, and the picked button = the summary Return', (k, st, i) => {
    renderState(st);
    const built = builtBar();
    expect(built).toEqual(asSegs(k));
    expect(drawn[i]).toEqual(asSegs(k));
    const picked = built.find((b) => b.on)!;
    expect(trioReturn(strings())).toBe(picked.v);
  });
});

describe('state A, Bonds & CDs: price change plus interest (DEC-6212)', () => {
  test('KeyBank CD +2.00%, US Treasury 2028 +2.13%, the bar +2.06%; the Total stays +8.26%; each line shows face, coupon and YTM', () => {
    renderState(STATES[0]);
    const lines = strings();
    // DEC-6323 (owner, 2026-10-19: "Line under a bond - new line missing maturity date."): the maturity date is the line's fourth part
    expect(lines).toContain('@KeyBank CD, $5,000 face · 4.00% · YTM 4.00% · matures Mar 31, 2027, $5,000, return +2.00%, $100 interest. Opens its page.');
    expect(lines).toContain('@US Treasury 2028, $4,000 face · 4.25% · YTM 4.23% · matures Feb 15, 2028, $4,000, return +2.13%, $85 interest. Opens its page.');
    expect(lines).toContain('$5,000 face · 4.00% · YTM 4.00% · matures Mar 31, 2027');
    expect(lines).toContain('@Bonds & CDs, $9,000, return +2.06%');
    expect(lines).toContain('@Total, $101,000, return +8.26%');
    expect(lines).toContain('@VOO · 160 shares, $90,000, return +7.67%, $1,500 dividends. Opens its page.');
  });
  test('states C and D: a Treasury with a face value, a maturity date and no rate shows those two; no price history, no return', () => {
    renderState(STATES[3]);
    expect(strings()).toContain('@Treasury 2031, $10,000 face · matures Nov 15, 2031, $10,000, return —. Opens its page.');
    screen.unmount();
    renderState(STATES[2]);
    expect(strings()).toContain('@Treasury 2031, $10,000 face · matures Nov 15, 2031, $10,000, return —. Opens its page.');
  });
});

describe('DEC-6323 · the maturity date on the line under a bond\'s name', () => {
  const withKcd = (extra: any): State => ({ ...STATES[0], account: { ...VAN, positions: VAN.positions.map((q: any) => q.position_id === 'kcd' ? { ...q, ...extra } : q) } });
  test('a matured CD says it matured, the matured banner\'s word, and has no yield to maturity', () => {
    renderState(withKcd({ maturity_date: '2026-09-15' }));
    expect(strings()).toContain('$5,000 face · 4.00% · matured Sep 15, 2026');
  });
  // with no known date there are no years left, so the yield to maturity is not known either (approxYTM) — both are left out
  test('a maturity date not known — missing, or not a real day — is left out', () => {
    renderState(withKcd({ maturity_date: undefined }));
    expect(strings()).toContain('$5,000 face · 4.00%');
    screen.unmount();
    renderState(withKcd({ maturity_date: '2027-02-30' }));
    expect(strings()).toContain('$5,000 face · 4.00%');
  });
});

describe('a record that begins today: the Since window reads one way whichever window is picked (2026-10-19)', () => {
  test('state D: Since today is not greyed, can be picked, and then reads as state C does — picked, a dash', () => {
    renderState(STATES[3]);
    const since = () => builtBar()[0];
    expect(since()).toEqual({ k: 'Since today', v: '—', on: false, no: false });
    const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show Since today'))!;
    fireEvent.press(btn);
    expect(since()).toEqual({ k: 'Since today', v: '—', on: true, no: false });
    expect(trioReturn(strings())).toBe('—');
    screen.unmount();
    renderState(STATES[2]);
    expect(builtBar()[0]).toEqual({ k: 'Since today', v: '—', on: true, no: false });
  });
  test('at rest with no figure, its name and dash are in the resting colours, not the greys of a window that cannot be picked', () => {
    const { Colors } = require('../../utils/theme');
    renderState(STATES[3]);
    const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show Since today'))!;
    const flat = (st: any) => Object.assign({}, ...[st].flat(Infinity).filter(Boolean));
    const [name, dash] = (btn.children as any[]).flatMap(function f(c: any): any[] { return c?.type === 'Text' ? [c] : (c?.children ?? []).flatMap(f); });
    expect(flat(name.props.style).color).toBe(Colors.textTertiary);
    expect(flat(dash.props.style).color).toBe(Colors.textPrimary);
    const y1 = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith('Show 1Y'))!;
    expect(y1.props.accessibilityState).toMatchObject({ selected: true });
  });
});
