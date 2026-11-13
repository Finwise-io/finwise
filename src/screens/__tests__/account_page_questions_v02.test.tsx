/** THE ACCOUNT PAGE AGAINST ACCOUNT-PAGE v02 (2026-11-12): questions about the account's values, the day the value is from, a
 *  holding's price day, and a holding's waiting question named on its line.
 *
 *  The drawing: MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v02.html, three states A to C. v02 is
 *  drawn over v01; v01's states A to F stay held word for word by account_page_drawing_states.test.tsx, which v02 does not change
 *  (none of v01's states has a value on the master record, so none shows a question, "as of", "date not stated" or "Price from").
 *  Method (docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md): each state's words are read out of the drawing (src/testing/mockStates.ts),
 *  the real screen is rendered with that state's record — built by the record's own writers — and every line v02 adds (rows 1 to
 *  9) must be on the screen word for word, in the drawing's order. The whole phone's coverage is printed: its other lines (the walk's
 *  and the table's figures over Jun 21 → Jul 2) are read from the daily record, not from these questions.
 *
 *  ANSWER (V2): "Choose the day ›" opens the date picker; the day saved is the store's answerAssetRecordQuestion; the values are
 *  dated that day and the question closes. "Not known" closes it and dates nothing.
 *
 *  WHERE THE RECORD'S WORDS AND THE DRAWING'S DIFFER, THE RECORD'S STAND (one source for every sentence) — one, held as KNOWN:
 *   · V2: his file's total is $169,664.71 and the record's sentence writes it so; the drawing rounds it to $169,665.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { drawnStates, screenWords, between, wordCoverage } from '../../testing/mockStates';
import {
  addRows, valueRows, purchasesFromList, valuesNow, valuesNeedingADate, questionsOf, type NewRow, type AssetRow,
} from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const DRAWN = drawnStates('MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v02.html');
// the rulings drawn on v02 since, by v03's READ THIS FIRST (2026-11-13): row D, the date question's "Not known" line
const RULED_SINCE: [string, string][] = [['its values stay off Net worth and Performance until a day is given', 'its values count in Net worth and Performance as your file states them, with no day']];
const drawn = (k: string) => { const st = DRAWN.find((d) => d.label.startsWith(`STATE ${k} ·`)); if (!st) throw new Error(`no state ${k}`);
  return RULED_SINCE.reduce((t, [was, now]) => t.split(was).join(now), st.text); };
const REPORT: Record<string, string> = {};
afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`\nACCOUNT PAGE vs account-page v02 — the whole phone, word for word\n${Object.entries(REPORT).map(([k, v]) => `  state ${k}: ${v}`).join('\n')}\n`);
  jest.useRealTimers();
});
const FAKE = { doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as any };
const today = (day: string) => jest.useFakeTimers({ now: new Date(`${day}T12:00:00`), ...FAKE });
const st = () => useStore.getState() as any;
afterEach(() => expect(st().assetRecordFaults ?? []).toEqual([]));
const at = (day: string) => `${day}T12:00:00.000Z`;
const shown = () => screenWords(screen.toJSON());
function holds(k: string, regions: [string, string][]) {
  const built = shown();
  REPORT[k] = wordCoverage(drawn(k), built).line;
  let from = 0;
  for (const [a, b] of regions) {
    const want = between(drawn(k), a, b);
    const i = built.indexOf(want, from);
    if (i < 0) throw new Error(`state ${k}: the drawing's «${want}»\n is not on the screen, which reads:\n${built}`);
    from = i + want.length;
  }
}

// ── STATES A and B · his Robinhood -2203 file, re-saved with no date, imported Jul 6, 2026 ──────────────────────────────
const F = 'rh2203';
const PUT = 'QQQ   261231P00600000';
const HIS_FILE = [
  { holding: 'LCTX', shares: 965, price: 1.21, value: 1167.65 },
  { holding: PUT, shares: 100, price: 14.075, value: 1407.5 },
  { holding: 'VMFXX', shares: 50000, price: 1, value: 50000 },
  { holding: '49306SAB2', shares: 1100, price: 99.99340, value: 109992.74 },
];
const FILE_ACCOUNT = {
  asset_id: F, label: 'Robinhood -2203', institution: 'Robinhood', kind: 'brokerage', source: 'imported', derive_balance: true,
  balance: 169664.71, cash_balance: 7096.82,
  positions: [
    { position_id: 'lctx', ticker: 'LCTX', asset_class: 'stock_etf', last_price: 1.21, lots: [{ lot_id: 'a', shares: 965, cost_per_share: null, purchase_date: null }] },
    { position_id: 'put', ticker: PUT, label: 'QQQ Dec 31 ’26 $600 Put', kind: 'options', asset_class: 'stock_etf', multiplier: 100, last_price: 14.075,
      lots: [{ lot_id: 'b', shares: 1, cost_per_share: 50.35, purchase_date: null }] },
    { position_id: 'cd', ticker: '49306SAB2', name: 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026', label: 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026', kind: 'cd', asset_class: 'bond',
      last_price: 99.99340, face_value: 110000, coupon_rate: 0.0385, maturity_date: '2026-08-24', lots: [{ lot_id: 'd', shares: 1100, cost_per_share: null, purchase_date: null }] },
    { position_id: 'vmfxx', ticker: 'VMFXX', asset_class: 'cash', last_price: 1, lots: [{ lot_id: 'c', shares: 50000, cost_per_share: 1, purchase_date: null }] },
  ],
};
function seed(account: any, record: AssetRow[], stored: any = {}) {
  st().resetAll();
  mockParams = { id: account.asset_id };
  mockPushes.length = 0;
  useStore.setState({ hideBalances: false, assetAccounts: [account], transactions: [], priceCache: {}, snapshotDays: [],
    assetRecord: record, assetRecordQuestions: stored, assetRecordFaults: [] } as any);
  render(<AccountPortfolioScreen />);
}
function stateA() {
  today('2026-07-06');
  // the file's holdings as purchases with no date, and its values with no day — as the file import saves them
  const lots: NewRow[] = HIS_FILE.map((h) => ({ accountId: F, holding: h.holding, kind: 'PURCHASE', date: null, shares: h.shares, price: null, amount: null, source: 'file' }));
  const r = addRows([], [...lots, ...valueRows({ accountId: F, date: null, source: 'file', cash: 7096.82, holdings: HIS_FILE })], at('2026-07-06'));
  seed(FILE_ACCOUNT, r, { [F]: { events: [], lists: [], needsADate: true, at: at('2026-07-06') } });
}
const answerJun21 = () => {
  fireEvent.press(screen.getByText('Choose the day ›'));
  fireEvent(screen.getByTestId('record-question-day'), 'onChange', { type: 'set', nativeEvent: { timestamp: new Date('2026-06-21T12:00:00').getTime(), utcOffset: 0 } }, new Date('2026-06-21T12:00:00'));
  fireEvent.press(screen.getByText('Save Jun 21, 2026'));
};

describe('state A — his re-saved file states no date', () => {
  test('the question in THIS ACCOUNT, above the three figures; "date not stated" under Ending market value and on the walk', () => {
    stateA();
    holds('A', [
      ['THIS ACCOUNT · SINCE TODAY', 'A question about your file Your file imported Jul 6, 2026 does not say what day its'],
      ['is from. What day is it from? Choose the day ›', 'as your file states them, with no day Ending market value'],
      ['date not stated Wealth generated', 'date not stated Wealth generated'],
      ['These values are from your file, which does not say what day they are from.', 'the day you give.'],
      ['Beginning market value (date not stated)', 'Beginning market value (date not stated)'],
      ['Ending market value (date not stated)', 'Ending market value (date not stated)'],
    ]);
    // KNOWN: the record writes his file's total to the cent
    expect(shown()).toContain('Your file imported Jul 6, 2026 does not say what day its $169,664.71 is from. What day is it from?');
  });
  test('V2 answered with a day: the values are dated Jun 21, 2026 on the record, the question closes, the answer line sits in its place', () => {
    stateA();
    answerJun21();
    expect([valuesNow(st().assetRecord, F)?.date, valuesNeedingADate(st().assetRecord, F)]).toEqual(['2026-06-21', []]);
    expect(questionsOf(st().assetRecord, st().assetRecordQuestions, F).filter((q) => q.kind === 'V2')).toEqual([]);
    expect(screen.queryByText('A question about your file')).toBeNull();
    expect(shown()).toContain('✓ Answered Jul 6, 2026: your file’s values are from Jun 21, 2026. Change your answer ›');
    // "Change your answer" asks it again, in the same place
    fireEvent.press(screen.getByText('Change your answer ›'));
    expect(screen.getByText('A question about your file')).toBeTruthy();
  });
  test('"Not known" dates nothing and closes the question', () => {
    stateA();
    fireEvent.press(screen.getByText('Not known'));
    expect(valuesNeedingADate(st().assetRecord, F)).toHaveLength(1);
    expect(screen.queryByText('A question about your file')).toBeNull();
  });
});

describe('state B — he answered Jun 21, 2026; the Jul 2 closes arrived', () => {
  test('the answer line; "as of Jul 2, 2026" under Ending market value; "Price from Jun 21, 2026" on the put, not on LCTX; the note says what it means', () => {
    stateA();
    answerJun21();
    // the price feed's values of Jul 2: LCTX's close; the put keeps his file's figure of Jun 21 (the feed does not price it)
    const feed = valueRows({ accountId: F, date: '2026-07-02', source: 'price-feed', cash: 7096.82,
      holdings: [{ holding: 'LCTX', shares: 965, price: 1.33, value: 1283.45 }, HIS_FILE[1], HIS_FILE[2], HIS_FILE[3]] });
    const closes = (c: number) => ({ points: [{ date: '2026-07-01', close: c }, { date: '2026-07-02', close: c }] });
    act(() => { useStore.setState({ assetRecord: addRows(st().assetRecord, feed, at('2026-07-06')), priceCache: { LCTX: closes(1.33), VMFXX: closes(1) } } as any); });
    holds('B', [
      ['✓ Answered Jul 6, 2026: your file’s values are from Jun 21, 2026.', 'Change your answer ›'],
      ['as of Jul 2, 2026 Wealth generated', 'as of Jul 2, 2026 Wealth generated'],
      ['A holding’s return is what its own price did in this window', 'that price is still used.'],
    ]);
    const built = shown();
    // the put and the CD, which the price feed does not price, keep his file's figures of Jun 21; LCTX and VMFXX have the Jul 2 close
    expect(built).toMatch(/QQQ 261231P00600000 [^›]*· Price from Jun 21, 2026/);
    expect(built).toMatch(/matures Aug 24, 2026 · Price from Jun 21, 2026/);
    expect(built).not.toMatch(/LCTX [^›]*Price from/);
    expect(built).not.toMatch(/VMFXX [^›]*Price from/);
  });
});

// ── STATE C · Robinhood Brokerage, linked; Robinhood's list differs on 2 holdings ─────────────────────────────────────────
const L = 'rhb';
function stateC() {
  today('2026-11-12');
  const buy = (holding: string, date: string, shares: number, price: number, over: Partial<NewRow> = {}): NewRow =>
    ({ accountId: L, holding, kind: 'PURCHASE', date, shares, price, amount: shares * price, source: 'typed', ...over });
  let r = addRows([], [buy('MSFT', '2026-07-29', 500, 350), buy('VTI', '2026-01-12', 20, 250, { source: 'linked', ref: 'rh-v', stillHeldOn: '2026-06-30' })], at('2026-08-01'));
  const lists = [...purchasesFromList(r, L, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-11').ask,
    ...purchasesFromList(r, L, 'VTI', [], 'linked', '2026-11-11').ask];
  r = addRows(r, valueRows({ accountId: L, date: '2026-11-11', source: 'linked', cash: 4449,
    holdings: [{ holding: 'MSFT', shares: 300, price: 425, value: 127500 }] }), at('2026-11-11'));
  seed({ asset_id: L, label: 'Robinhood Brokerage', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected',
    balance: 222949, cash_balance: 4449, last_synced: '2026-11-12T08:00:00Z',
    positions: [
      { position_id: 'm', ticker: 'MSFT', asset_class: 'stock_etf', last_price: 425, lots: [{ lot_id: 'm1', shares: 500, cost_per_share: 360, purchase_date: '2026-07-29' }] },
      { position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 300, lots: [{ lot_id: 'v1', shares: 20, cost_per_share: 290, purchase_date: '2026-01-12' }] },
    ] }, r, { [L]: { events: [], lists, at: at('2026-11-11') } });
}
describe('state C — a linked account with questions waiting', () => {
  test('the amber box counts the questions and names each holding with its door; "as of Nov 11, 2026"; each holding\'s line says so', () => {
    stateC();
    holds('C', [
      ['2 questions from Robinhood', 'every total on this page counts them.'],
      ['Ending market value $222,949 as of Nov 11, 2026', 'as of Nov 11, 2026'],
    ]);
    const built = shown();
    expect(built).toMatch(/MSFT 500 shares · \$425\.00 Robinhood says 300 · question on its page ›/);
    expect(built).toMatch(/VTI 20 shares · \$300\.00 Robinhood says 0 · question on its page ›/);
  });
  test('each door opens that holding\'s own page, where the question is asked', () => {
    stateC();
    fireEvent.press(screen.getByLabelText(/^MSFT — .*Answer on MSFT’s page\.$/));
    fireEvent.press(screen.getByLabelText(/^VTI — .*Answer on VTI’s page\.$/));
    expect(mockPushes).toEqual(['/holding-detail?account=rhb&position=m', '/holding-detail?account=rhb&position=v']);
  });
});

describe('the drawing, read (a guard must prove it looked)', () => {
  test('three states, A to C, each from its top bar', () => {
    expect(DRAWN.map((d) => d.label.slice(0, 7))).toEqual(['STATE A', 'STATE B', 'STATE C']);
    for (const d of DRAWN) expect(d.text.startsWith('‹ Back')).toBe(true);
  });
});
