/** HIS DECISIONS, READ AGAINST THE ACCOUNT PAGE ITSELF — part 2 (PF-DECISIONS, 2026-10-22).
 *
 *  The account page (Account detail / Account portfolio, one screen: src/screens/AccountPortfolioScreen.tsx) is where
 *  Performance opens each account. Each decision below governs it and stood in the decision log as "RECORDED — status not
 *  established" or "CODED": nothing re-ran it. Each test renders the page in the approved drawing's own data states
 *  (account-page v01, states A to F, seeded exactly as account_page_drawing_states seeds them, on the drawing's day,
 *  Sep 30, 2026) or in a state the decision itself names, and fails if the page breaks the decision. Every test is named
 *  by the decision it holds.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import AccountDetailRoute from '../../../app/account-detail';
import { useStore } from '../../store/useStore';
import { settleBondValue } from '../../../MoneyKeel/functions/networth-and-performance/bonds';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: (r: string) => mockPushes.push(r), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

// ── the drawing's data states, as account_page_drawing_states seeds them ─────────────────────────────────────────
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
// the day the account is linked. State C is drawn with NO record of it at all (the drawing's row 39: "no day is
// recorded and no money has moved") — the page opened before today's record holds the account. State D is drawn on the
// record AS THE APP WRITES IT: Home writes today's values the moment it opens, so the record holds one day, today.
const FID_TODAY = [linkedDay('fid', TODAY, 50_000)];

// ── STATE E · US Treasury 4.00% 2030, built by hand Jun 2, 2026 at $9,850; $9,700 paid (row 46, 2026-10-20) ─────────
const TSY = {
  asset_id: 'tsy30', label: 'US Treasury 4.00% 2030', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 9_850, face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30', source: 'manual', value_as_of: '2026-06-02',
  amount_paid: 9_700,
};
const TSY_DAYS = [typedDay('tsy30', '2026-06-02', 9_850)];

// ── STATE F · state E's bond before a market value was entered (row 47, 2026-10-20, DEC-0281) ──────────────────────
// Stored by the REAL writer: the account as an editor hands it over — a face value, no market value, nothing paid — through
// the one value rule the store applies on save (settleBondValue, asked of the bonds door), never a hand-typed balance.
const { amount_paid: _paid, balance: _market, ...TSY_NO_VALUE } = TSY;
const TSY_FACE = settleBondValue({ ...TSY_NO_VALUE } as any, { ...TSY_NO_VALUE } as any);
const TSY_FACE_DAYS = [typedDay('tsy30', '2026-06-02', 10_000)];

/** `opened`: the window the page is opened with — Performance hands over the window picked there (row 18); `pick`: a window
 *  tapped on the page afterwards. */
type State = { key: string; account: any; ledger: any[]; days: any[]; prices: Record<string, any>; pick: string; others?: any[]; opened?: string };
const STATES: State[] = [
  { key: 'A', account: VAN, ledger: VAN_LEDGER, days: VAN_DAYS, prices: { VOO, '49306SAB2': flat100, '91282CGM7': flat100 }, pick: 'SINCE' },
  { key: 'B', account: MUNI, ledger: [], days: MUNI_DAYS, prices: {}, pick: 'SINCE' },
  { key: 'C', account: FID, ledger: [], days: [], prices: { VTI }, pick: 'SINCE' },
  // "THE SAME ACCOUNT, 1Y PICKED ON PERFORMANCE": opened from Performance with 1Y picked there (row 18)
  { key: 'D', account: FID, ledger: [], days: FID_TODAY, prices: { VTI }, pick: 'SINCE', opened: '1Y' },
  { key: 'E', account: TSY, ledger: [], days: TSY_DAYS, prices: {}, pick: 'SINCE' },
  { key: 'F', account: TSY_FACE, ledger: [], days: TSY_FACE_DAYS, prices: {}, pick: 'SINCE' },
];

function renderState(st: State) {
  useStore.getState().resetAll();
  mockParams = { id: st.account.asset_id, ...(st.opened ? { period: st.opened } : {}) };
  useStore.setState({ hideBalances: false, assetAccounts: [st.account, ...(st.others ?? [])], transactions: st.ledger,
    snapshotDays: st.days, priceCache: st.prices } as any);
  render(<AccountPortfolioScreen />);
  if (st.pick !== 'SINCE') pick(st.pick);
}
function pick(k: string) {
  const btn = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel ?? '').startsWith(`Show ${k}`));
  fireEvent.press(btn!);
}

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

/** every visible line, in order — what a person reads */
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
const state = (k: string) => STATES.find((s) => s.key === k)!;
const flat = (n: any) => StyleSheet.flatten(n?.props?.style) ?? {};
beforeEach(() => { mockPushes.length = 0; });

// states the decisions name, beyond the drawing's six
const CRYPTO = { asset_id: 'btc', label: 'Coinbase Bitcoin', kind: 'crypto', asset_class: 'alternatives', tax_bucket: 'TAXABLE', balance: 20_000, source: 'manual', value_as_of: '2026-09-01' };
const CRYPTO_STATE: State = { key: 'crypto', account: CRYPTO, ledger: [], days: [typedDay('btc', '2026-06-01', 18_000), typedDay('btc', '2026-09-01', 20_000)], prices: {}, pick: 'SINCE' };
const TWO_CDS = { asset_id: 'cds', label: 'Ally CDs', institution: 'Ally', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000, source: 'connected', last_synced: `${TODAY}T08:00:00Z`,
  positions: [
    { position_id: 'c1', ticker: 'CD-A', name: 'Ally CD A', label: 'Ally CD A', kind: 'cd', asset_class: 'bond', last_price: 100, face_value: 5_000, coupon_rate: 0.04, maturity_date: '2027-03-31', lots: [{ lot_id: 'a', shares: 50, cost_per_share: 100, purchase_date: '2026-01-02' }] },
    { position_id: 'c2', ticker: 'CD-B', name: 'Ally CD B', label: 'Ally CD B', kind: 'cd', asset_class: 'bond', last_price: 100, face_value: 5_000, coupon_rate: 0.045, maturity_date: '2027-06-30', lots: [{ lot_id: 'b', shares: 50, cost_per_share: 100, purchase_date: '2026-01-02' }] },
  ] };
const TWO_CDS_STATE: State = { key: 'cds', account: TWO_CDS, ledger: [{ id: 'u1', date: '2026-09-15', type: 'INTEREST', amount: 60, account_id: 'cds', source: 'connected' }],
  days: [linkedDay('cds', '2026-01-02', 10_000), linkedDay('cds', '2026-09-30', 10_060)], prices: { 'CD-A': flat100, 'CD-B': flat100 }, pick: 'SINCE' };
const MATURED = { asset_id: 'old', label: 'KeyBank CD 3.00%', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 5_000, face_value: 5_000, coupon_rate: 0.03, maturity_date: '2026-09-15', source: 'manual', value_as_of: '2026-06-01' };
const MATURED_STATE: State = { key: 'matured', account: MATURED, ledger: [], days: [typedDay('old', '2026-06-01', 5_000)], prices: {}, pick: 'SINCE' };
const NO_PRICE = { ...FID, asset_id: 'np', positions: [{ position_id: 'zz', ticker: 'ZZZQ', asset_class: 'stock_etf', lots: [{ lot_id: 'z', shares: 10, cost_per_share: 50, purchase_date: '2025-01-02' }] }] };
const NO_PRICE_STATE: State = { key: 'np', account: NO_PRICE, ledger: [], days: [linkedDay('np', TODAY, 50_000)], prices: {}, pick: 'SINCE' };

// ── DEC-0016 (the account page's two of its four) ─────────────────────────────────────────────────────────────
// "See your growth" — a round of mock decisions: (3) a matured bond shows a banner, and marking it paid out writes a record
// of the payment; (4) "Add" and "Record" open the real editor for the thing picked. ((1) the separator dot and (2) the
// Net worth rows' source label are Net worth's.)
test('DEC-0016 (3) — a CD past its maturity date shows the matured banner, and "Paid out to my bank" writes the payout as a record', () => {
  renderState(MATURED_STATE);
  const all = lines();
  expect(all).toContain('⏰ This CD matured Sep 15, 2026.');
  const before = ((useStore.getState() as any).transactions ?? []).length;
  fireEvent.press(screen.getByLabelText('Paid out to my bank — records the payout'));
  const after = (useStore.getState() as any).transactions ?? [];
  expect(after.length).toBe(before + 1);
  expect(after.find((t: any) => t.account_id === 'old' && t.amount === 5_000 && /paid out/i.test(String(t.note ?? '')))).toBeDefined();
});
test('DEC-0016 (4) — on a stock account (state A), "Add a buy or sale ›" opens the trade sheet on the page, not another screen', () => {
  renderState(state('A'));
  fireEvent.press(screen.getByLabelText('Add a buy or sale for Vanguard Brokerage'));
  expect(mockPushes).toEqual([]);
  expect(lines()).toContain('Record activity');
});

// ── DEC-0094 ─────────────────────────────────────────────────────────────────────────────────────────
// "the top of the page says $224190, and below it says $224690" — income naming no holding was pinned onto EVERY holding
// that was not a share. It is counted once, at the account.
test('DEC-0094 — $60 of interest that names no holding, in an account of two CDs, is on neither CD\'s row and is counted once for the account', () => {
  renderState(TWO_CDS_STATE);
  const all = lines();
  const rowsAt = ['CD-A', 'CD-B'].map((k) => all.indexOf(k));
  expect(rowsAt.every((i) => i > 0)).toBe(true);
  for (const i of rowsAt) {
    const block = all.slice(i, i + 6).join(' | ');
    expect(block).not.toMatch(/Income: \$60/);
  }
  expect(all.filter((l) => /^Income: /.test(l))).toEqual([]);
  expect(all.find((l) => l.includes('Income sits with the holding that earned it'))).toMatch(/\(60 = \$60 for this account\)/);
});

// ── DEC-0099 ─────────────────────────────────────────────────────────────────────────────────────────
// A line that names a missing answer takes you to THAT answer, not to a screen from which it is two taps further.
test('DEC-0099 — on a bond with no tax type (state B), "tax type not stated — choose ›" opens this account\'s own editor, where the answer is set', () => {
  renderState(state('B'));
  expect(lines()).toContain('Bonds & CDs · tax type not stated — choose ›');
  fireEvent.press(screen.getByLabelText('Tax type not stated. Tap to choose.'));
  expect(mockPushes).toEqual(['/add-account?edit=muni']);
});

// ── DEC-0216 ─────────────────────────────────────────────────────────────────────────────────────────
// "standard size 20" — every screen title is 20 points.
test.each(['A', 'B', 'C', 'E'])('DEC-0216 — the account page title prints at 20 points (state %s)', (k) => {
  renderState(state(k));
  const name = state(k).account.label;
  const t = screen.getAllByText(name).find((n: any) => flat(n).fontSize != null);
  expect(flat(t).fontSize).toBe(20);
});

// ── DEC-0224 ─────────────────────────────────────────────────────────────────────────────────────────
// "Link it (read-only)" is the door, so an account that went through it is "Linked" and the repair is "Link again".
test('DEC-0224 — a linked account says "Linked"; when the last sync could not reach it, the page offers "Link again"', () => {
  renderState(state('A'));
  expect(lines()).toContain('🔗 Linked');
  expect(lines().filter((l) => /Link again/.test(l))).toEqual([]);
  screen.unmount();
  useStore.getState().resetAll();
  mockParams = { id: 'van' };
  useStore.setState({ hideBalances: false, assetAccounts: [VAN], transactions: VAN_LEDGER, snapshotDays: VAN_DAYS,
    priceCache: { VOO, '49306SAB2': flat100, '91282CGM7': flat100 }, syncFailures: [{ accountId: 'van', at: `${TODAY}T08:00:00Z` }] } as any);
  render(<AccountPortfolioScreen />);
  const all = lines();
  expect(all.filter((l) => /^Link again ›$/.test(l))).toHaveLength(1);
  expect(all.filter((l) => /^(Re-?connect|Reconnect)/i.test(l))).toEqual([]);
});

// ── DEC-0296 ─────────────────────────────────────────────────────────────────────────────────────────
// "an unknown input produces no number and a reason — never a default."
test('DEC-0296 — a holding with no price says so in words on its row, and its return is a dash, never a made-up figure', () => {
  renderState(NO_PRICE_STATE);
  const all = lines();
  const at = all.indexOf('ZZZQ');
  expect(at).toBeGreaterThan(0);
  expect(all[at + 1]).toMatch(/^10 shares · no price today/);
  expect(all.slice(at, at + 5)).toContain('—');
  expect(all.slice(at, at + 5).filter((l) => /^[+−-]?0\.00%$/.test(l))).toEqual([]);
});

// ── DEC-0437 ─────────────────────────────────────────────────────────────────────────────────────────
// "By hand · you update it" — a hand-entered account is never labelled as linked, and says whose job it is.
test.each(['B', 'E', 'F'])('DEC-0437 — an account built by hand (state %s) reads "✍️ By hand · you update it" and nothing says Linked', (k) => {
  renderState(state(k));
  const all = lines();
  expect(all).toContain('✍️ By hand · you update it');
  expect(all.filter((l) => /\bLinked\b/.test(l))).toEqual([]);
});

// ── DEC-0444 ─────────────────────────────────────────────────────────────────────────────────────────
// "Bonds, and alternatives all have current value which would be critical to track." A bond's or an alternative's value
// moves; it can be updated, and the change counts.
test('DEC-0444 — a bond (state B) and an alternative typed by hand each offer "Update value", and the change they record is counted', () => {
  renderState(state('B'));
  let all = lines();
  expect(all).toContain('Update value');
  // Muni 2029 typed at $10,000 on Jun 2 and updated to $10,150 on Sep 1: the walk counts the $150 it gained
  expect(all[all.indexOf('Wealth generated') + 1]).toBe('$150');
  expect(all[all.indexOf('Return') + 1]).toBe('+1.50%');
  screen.unmount();
  renderState(CRYPTO_STATE);
  all = lines();
  expect(all).toContain('Update value');
  expect(all[all.indexOf('Wealth generated') + 1]).toBe('$2,000');
});

// ── DEC-0448 ─────────────────────────────────────────────────────────────────────────────────────────
// "Is user providing TTM ROI on particular asset? If yes, why it say not editable?" — "yes": it is the person's, so it
// can be edited.
test('DEC-0448 — on an alternative typed by hand, the historic 12-month return is the person\'s to enter: the card opens a box, and Save keeps it on the account', () => {
  renderState(CRYPTO_STATE);
  expect(lines()).toContain('HISTORIC 12-MONTH RETURN');
  fireEvent.press(screen.getByLabelText('Add historic 12-month return'));
  fireEvent.changeText(screen.getByLabelText('Historic 12-month return on your holdings, in percent'), '6.5');
  fireEvent.press(screen.getByLabelText('Save historic 12-month return'));
  const saved = ((useStore.getState() as any).assetAccounts ?? []).find((a: any) => a.asset_id === 'btc');
  expect(saved.actual_ttm).toBeCloseTo(0.065, 10);
});

// ── DEC-0646 ─────────────────────────────────────────────────────────────────────────────────────────
// "Account detail screen should be same as Account Portfolio screen" — one screen. (Its design source is now the
// account-page drawing v01, DEC-6457; the one-screen rule stands.)
test('DEC-0646 — the Account detail route opens the Account portfolio screen itself, one screen', () => {
  expect(AccountDetailRoute).toBe(AccountPortfolioScreen);
});
