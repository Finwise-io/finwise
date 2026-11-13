/** THE HOLDING PAGE AGAINST HOLDING-DETAIL v03 (2026-11-12): the master record's questions about one holding, each asked beside the
 *  figure it changes, and the page after each answer.
 *
 *  The drawing: MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_holding-detail_v03.html, twelve states A to L.
 *  Method (docs/MOCK-MATCH-AUDIT-STANDING-ORDER.md): each state's words are read out of the drawing (src/testing/mockStates.ts); the
 *  real screen is rendered with that state's record — built by the record's own writers, the question kept as the store keeps it —
 *  and its words read off the rendered tree. WORD FOR WORD: every line this drawing adds (the box, its headline, sentence, choices
 *  and their second lines, the line under them, the other source's figure, the answer line, "Price from") is the screen's, in the
 *  drawing's order. The whole phone's coverage is printed: the lines v03 did not change (the price band, the comparison's example
 *  figures, the cents the drawing writes on whole-dollar rows) are v02's and are held by that drawing's own tests.
 *
 *  ANSWERS: each kind drawn (E1, E2, L1, L2, S1, X1, C1) is answered by pressing its button — the store's answerAssetRecordQuestion or
 *  confirmMyChange writes it — and the record changes as the design says, and the question closes.
 *
 *  WHERE THE RECORD'S WORDS AND THE DRAWING'S DIFFER, THE RECORD'S STAND (one source for every sentence) — three, held below as KNOWN:
 *   · X1: the record writes "Confirm they expired worthless", the drawing "Confirm it expired worthless" (one put).
 *   · L1: the record writes "indicates 300 MSFT bought Jul 30;", the drawing "bought Jul 30, 2026;".
 *   · C1: the record writes "price of 350, you entered 320 … to 320", the drawing "$350 … $320 … $320".
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { HoldingEditor } from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { drawnStates, screenWords, between, wordCoverage, words } from '../../testing/mockStates';
import {
  addRows, sortArriving, purchasesFromList, valueRows, saleRow, openPurchases, sharesOnRecord, rowsInForce, saleGain, questionsOf,
  type NewRow, type AssetRow,
} from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const DRAWING = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_holding-detail_v03.html';
const DRAWN = drawnStates(DRAWING);
const drawn = (k: string) => { const st = DRAWN.find((d) => d.label.startsWith(`STATE ${k} ·`)); if (!st) throw new Error(`no state ${k}`); return st.text; };
const REPORT: Record<string, string> = {};
afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`\nHOLDING PAGE vs holding-detail v03 — the whole phone, word for word\n${Object.entries(REPORT).map(([k, v]) => `  state ${k}: ${v}`).join('\n')}\n`);
});

const A = 'rh';
const at = (day: string) => `${day}T12:00:00.000Z`;
const FAKE = { doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as any };
const today = (day: string) => jest.useFakeTimers({ now: new Date(`${day}T12:00:00`), ...FAKE });
afterAll(() => jest.useRealTimers());
const st = () => useStore.getState() as any;
afterEach(() => expect(st().assetRecordFaults ?? []).toEqual([]));

const buy = (holding: string, date: string | null, shares: number, price: number, over: Partial<NewRow> = {}): NewRow =>
  ({ accountId: A, holding, kind: 'PURCHASE', date, shares, price, amount: shares * price, source: 'typed', ...over });
const series = (pts: [string, number][]) => ({ points: pts.map(([date, close]) => ({ date, close })) });

function seed(o: { record: AssetRow[]; stored?: any; label?: string; institution?: string; position: any; transactions?: any[]; prices?: any; balance?: number }) {
  st().resetAll();
  mockParams = { account: A, position: o.position.position_id };
  useStore.setState({
    hideBalances: false, assetRecord: o.record, assetRecordQuestions: o.stored ?? {}, assetRecordFaults: [],
    assetAccounts: [{ asset_id: A, label: o.label ?? 'Robinhood Brokerage', institution: o.institution ?? 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE',
      source: 'connected', balance: o.balance ?? 0, positions: [o.position] }],
    transactions: o.transactions ?? [], priceCache: o.prices ?? {},
  } as any);
  render(<HoldingDetailScreen />);
}
const shown = () => screenWords(screen.toJSON());
/** every region the drawing adds to a state is on the screen, word for word, in order; the whole phone's coverage is printed */
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
const MSFT_PRICES = { MSFT: series([['2026-11-10', 421.6], ['2026-11-11', 425]]) };
const msft = (lots: any[]) => ({ position_id: 'm', ticker: 'MSFT', label: 'Microsoft Corporation', asset_class: 'stock_etf', last_price: 425, lots });

// ── E1 · state A, and B after "Change" ────────────────────────────────────────────────────────────────────────────────
function stateA() {
  today('2026-11-12');
  const r = addRows([], [buy('MSFT', '2026-07-30', 500, 320)], at('2026-08-01'));
  const events = sortArriving(r, [buy('MSFT', '2026-07-30', 500, 350, { source: 'linked', ref: 'rh-1' })]).ask;
  seed({ record: r, stored: { [A]: { events, lists: [], at: at('2026-11-11') } }, balance: 212500, prices: MSFT_PRICES,
    position: msft([{ lot_id: 'l1', shares: 500, cost_per_share: 320, purchase_date: '2026-07-30' }]) });
}
describe('E1 — Robinhood sends another price for your purchase', () => {
  test('state A: on the purchase, Robinhood’s figure under his, the box, three choices with what each makes, the line under them', () => {
    stateA();
    holds('A', [['Quantity 500 shares', 'Quantity 500 shares'], ['WHAT YOU BOUGHT Jul 30, 2026', 'every figure on this page uses it.']]);
  });
  test('state B: "Change" writes $350 to the record, the question closes, and the answer line sits in its place; "Change your answer" then "Keep mine" puts $320 back', () => {
    stateA();
    fireEvent.press(screen.getByText('Change'));
    expect(openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.price)).toEqual([350]);
    expect(questionsOf(st().assetRecord, st().assetRecordQuestions, A).filter((q) => q.kind === 'E1')).toEqual([]);
    expect(screen.queryByText('A question from Robinhood')).toBeNull();
    holds('B', [['✓ Answered Nov 12, 2026: Robinhood’s price, $350.', 'Change your answer ›']]);
    fireEvent.press(screen.getByText('Change your answer ›'));
    fireEvent.press(screen.getByText('Keep mine'));
    expect(openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.price)).toEqual([320]);
  });
});

// ── E2 · state C ────────────────────────────────────────────────────────────────────────────────────────────────────────
function stateC() {
  today('2026-11-12');
  const r = addRows([], [buy('MSFT', '2026-07-29', 500, 350)], at('2026-08-01'));
  const events = sortArriving(r, [buy('MSFT', '2026-07-30', 500, 350, { source: 'linked', ref: 'rh-2' })]).ask;
  seed({ record: r, stored: { [A]: { events, lists: [], at: at('2026-11-11') } }, balance: 212500, prices: MSFT_PRICES,
    position: msft([{ lot_id: 'l1', shares: 500, cost_per_share: 350, purchase_date: '2026-07-29' }]) });
}
describe('E2 — Robinhood sends another date for your purchase', () => {
  test('state C: "Robinhood says Jul 30, 2026", the box, "bought Jul 30, 2026" and "bought Jul 29, 2026", no sale moves', () => {
    stateC();
    holds('C', [['WHAT YOU BOUGHT Jul 29, 2026', 'no sale’s gain moves with the date.']]);
  });
  test('"Change" dates the purchase Jul 30 on the record and the question closes', () => {
    stateC();
    fireEvent.press(screen.getByText('Change'));
    expect(openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.date)).toEqual(['2026-07-30']);
    expect(screen.queryByText('A question from Robinhood')).toBeNull();
  });
});

// ── L1 · states D and E ─────────────────────────────────────────────────────────────────────────────────────────────────
function stateD() {
  today('2026-11-12');
  const r = addRows([], [buy('MSFT', '2026-07-29', 500, 350)], at('2026-08-01'));
  const lists = purchasesFromList(r, A, 'MSFT', [{ date: '2026-07-30', shares: 300, price: 350 }], 'linked', '2026-11-11').ask;
  seed({ record: r, stored: { [A]: { events: [], lists, at: at('2026-11-11') } }, balance: 212500, prices: MSFT_PRICES,
    position: msft([{ lot_id: 'l1', shares: 500, cost_per_share: 350, purchase_date: '2026-07-29' }]) });
}
describe('L1 — Robinhood’s list states other shares (his MSFT case)', () => {
  test('state D: under Quantity, "Robinhood says 300", the box, what each answer is worth, and what stands meanwhile', () => {
    stateD();
    holds('D', [['Quantity 500 shares Robinhood says 300', 'MSFT bought Jul 30'], ['; you entered 500 bought Jul 29.', 'beside them.'], ['WHAT YOU BOUGHT Jul 29, 2026', 'WHAT YOU BOUGHT Jul 29, 2026']]);
    // KNOWN: the record names the listed purchase "bought Jul 30" without its year, where the drawing writes "Jul 30, 2026"
    expect(shown()).toContain('Robinhood’s list of Nov 11, 2026 indicates 300 MSFT bought Jul 30; you entered 500 bought Jul 29.');
  });
  test('state E: "The list is correct" makes the record 300 shares bought Jul 30, the question closes, the answer line names it', () => {
    stateD();
    fireEvent.press(screen.getByText('The list is correct'));
    expect([sharesOnRecord(st().assetRecord, A, 'MSFT'), openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.date)]).toEqual([300, ['2026-07-30']]);
    expect(screen.queryByText('A question from Robinhood')).toBeNull();
    holds('E', [['✓ Answered Nov 12, 2026: Robinhood’s list — 300 shares bought Jul 30, 2026.', 'Change your answer ›']]);
  });
});

// ── L2 · state F ────────────────────────────────────────────────────────────────────────────────────────────────────────
function stateF() {
  today('2026-11-12');
  // Robinhood's own purchase, on its list of Jun 30 (the record holds it; he did not enter it)
  const r = addRows([], [buy('VTI', '2026-01-12', 20, 250, { source: 'linked', ref: 'rh-v', stillHeldOn: '2026-06-30' })], at('2026-06-30'));
  const lists = purchasesFromList(r, A, 'VTI', [], 'linked', '2026-11-11').ask;
  seed({ record: r, stored: { [A]: { events: [], lists, at: at('2026-11-11') } }, balance: 6000,
    prices: { VTI: series([['2026-11-10', 298.8], ['2026-11-11', 300]]) },
    position: { position_id: 'v', ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', asset_class: 'stock_etf', last_price: 300,
      lots: [{ lot_id: 'l1', shares: 20, cost_per_share: 250, purchase_date: '2026-01-12' }] } });
}
describe('L2 — Robinhood’s list leaves the holding out', () => {
  test('state F: "Robinhood says 0", the box, "0 shares · worth $0" and "20 shares · worth $6,000", the other way out', () => {
    stateF();
    holds('F', [['Quantity 20 shares Robinhood says 0', 'this question closes.']]);
  });
  test('"The list is correct" takes VTI to 0 shares on the record and the question closes; "Mine is correct" keeps 20', () => {
    stateF();
    fireEvent.press(screen.getByText('Mine is correct'));
    expect(sharesOnRecord(st().assetRecord, A, 'VTI')).toBe(20);
    expect(screen.queryByText('A question from Robinhood')).toBeNull();
    stateF();
    fireEvent.press(screen.getByText('The list is correct'));
    expect(sharesOnRecord(st().assetRecord, A, 'VTI')).toBe(0);
  });
});

// ── S1 · states G and H ─────────────────────────────────────────────────────────────────────────────────────────────────
function stateG() {
  today('2026-11-12');
  const r = addRows([], [buy('MSFT', null, 100, 350), buy('MSFT', '2026-11-05', 100, 400),
    saleRow({ accountId: A, holding: 'MSFT', date: '2026-11-10', shares: 100, price: 420, source: 'typed' })], at('2026-11-10'));
  seed({ record: r, balance: 42500, prices: MSFT_PRICES,
    position: msft([{ lot_id: 'l0', shares: 100, cost_per_share: 350, purchase_date: null }, { lot_id: 'l1', shares: 100, cost_per_share: 400, purchase_date: '2026-11-05' }]),
    transactions: [{ id: 's1', type: 'SELL', account_id: A, ticker: 'MSFT', shares: 100, price: 420, amount: 42000, date: '2026-11-10' }] });
}
describe('S1 — a sale that could have sold a purchase with no date', () => {
  test('state G: every figure the sale’s purchase decides says it is not known, and the question sits under Realized from sales', () => {
    stateG();
    holds('G', [
      ['Change since purchase Not known', 'sale came from'],
      ['Price paid (average) ⓘ Not known', 'sale came from'],
      ['Total paid Not known', 'sale came from'],
      ['Realized from sales Not known', 'so you are asked.'],
      ['IF YOU SOLD TODAY Gain Not known', 'sale came from'],
    ]);
  });
  test('state H: picking the Nov 5 purchase writes the sale from it ($2,000), the question closes, and the answer line names it', () => {
    stateG();
    fireEvent.press(screen.getByText('Nov 5, 2026 · 100 at $400'));
    const sale = rowsInForce(st().assetRecord).find((x) => x.kind === 'SALE')!;
    expect(saleGain(st().assetRecord, sale.rowId)).toBe(2000);
    expect(screen.queryByText('A question about your sale')).toBeNull();
    holds('H', [['✓ Answered Nov 12, 2026: the 100 sold on Nov 10 came from the Nov 5, 2026 purchase.', 'Change your answer ›']]);
  });
});

// ── X1 · states I and J (his QQQ put) ───────────────────────────────────────────────────────────────────────────────────
const PUT = 'QQQ   261231P00600000';
function stateI() {
  today('2027-01-04');
  let r = addRows([], [buy(PUT, null, 100, 50.35, { source: 'file' })], at('2026-06-21'));
  r = addRows(r, valueRows({ accountId: A, date: '2026-12-24', source: 'file', cash: 7096.82, holdings: [{ holding: PUT, shares: 100, price: 0.05, value: 5 }] }), at('2026-12-24'));
  const lists = purchasesFromList(r, A, PUT, [], 'file', '2027-01-04').ask;
  r = addRows(r, valueRows({ accountId: A, date: '2027-01-04', source: 'file', cash: 7096.82 }), at('2027-01-04'));
  seed({ record: r, stored: { [A]: { events: [], lists, at: at('2027-01-04') } }, label: 'Robinhood -2203', balance: 7101.82,
    prices: { [PUT]: series([['2026-12-23', 0.06], ['2026-12-24', 0.05]]) },
    position: { position_id: 'q', ticker: PUT, label: 'QQQ Dec 31 ’26 $600 Put', kind: 'options', asset_class: 'stock_etf', multiplier: 100, last_price: 0.05,
      lots: [{ lot_id: 'l0', shares: 1, cost_per_share: 50.35, purchase_date: null }] } });
}
describe('X1 — an option past its expiry leaves the list', () => {
  test('state I: "Price from Dec 24, 2026" in place of the stale line; under Quantity "Your file of Jan 4, 2027 says 0" and the box', () => {
    stateI();
    holds('I', [
      ['Price from Dec 24, 2026', 'still used for the value'],
      ['Your file of Jan 4, 2027 says 0 A question about your file', 'bought at $50.35 a share).'],
      ['Expired a sale of 100 shares', 'stays shown'],
    ]);
    // KNOWN: the record's sentence ends "Confirm they expired worthless on Dec 31: a loss of $5,035." where the drawing writes "it"
    expect(shown()).toContain('Confirm they expired worthless on Dec 31: a loss of $5,035.');
  });
  test('state J: "Expired" writes a sale of 100 at $0 on Dec 31, 2026 — a loss of $5,035 — and the answer line says so', () => {
    stateI();
    fireEvent.press(screen.getByText('Expired'));
    const sale = rowsInForce(st().assetRecord).find((x) => x.kind === 'SALE')!;
    expect([sale.date, sale.shares, sale.price, saleGain(st().assetRecord, sale.rowId), sharesOnRecord(st().assetRecord, A, PUT)]).toEqual(['2026-12-31', 100, 0, -5035, 0]);
    expect(screen.queryByText('A question about your file')).toBeNull();
    holds('J', [['✓ Answered Jan 4, 2027: expired worthless on Dec 31, 2026 — a sale of 100 shares at $0, a loss of $5,035.', 'Change your answer ›']]);
  });
  test('"Sold or exercised" writes no sale and closes the question', () => {
    stateI();
    fireEvent.press(screen.getByText('Sold or exercised'));
    expect(rowsInForce(st().assetRecord).filter((x) => x.kind === 'SALE')).toEqual([]);
    expect(screen.queryByText('A question about your file')).toBeNull();
  });
});

// ── C1 · states K and L (his own sentence) ──────────────────────────────────────────────────────────────────────────────
function stateK() {
  today('2026-11-12');
  const r = addRows([], [buy('MSFT', '2026-07-30', 100, 350, { source: 'linked', ref: 'rh-c' })], at('2026-08-01'));
  seed({ record: r, balance: 42500, prices: MSFT_PRICES, position: msft([{ lot_id: 'l1', shares: 100, cost_per_share: 350, purchase_date: '2026-07-30' }]) });
  const editor = screen.UNSAFE_getByType(HoldingEditor);
  const p = { ...st().assetAccounts[0].positions[0] };
  act(() => editor.props.onSave(A, { ...p, lots: [{ ...p.lots[0], cost_per_share: 320 }] }, false));
}
describe('C1 — he changes Robinhood’s price in ✎ Edit and taps Save', () => {
  test('state K: nothing is written; the confirmation sits on the purchase with what each choice makes', () => {
    stateK();
    expect(openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.price)).toEqual([350]);
    expect(st().assetAccounts[0].positions[0].lots[0].cost_per_share).toBe(350);
    holds('K', [['WHAT YOU BOUGHT Jul 30, 2026 100 sh @ $350.00 Confirm your change', 'Confirm your change'],
      ['Confirm 100 at $320', 'nothing is written until you confirm.']]);
    // KNOWN: the record writes his sentence without dollar signs
    expect(shown()).toContain('The information from Robinhood indicates price of 350, you entered 320. Confirm changing price for 100 shares of MSFT to 320.');
  });
  test('state L: "Confirm" writes $320 (the store’s confirmMyChange), the purchase says "you entered this · Robinhood indicates $350.00", no question is left', () => {
    stateK();
    fireEvent.press(screen.getByText('Confirm'));
    expect(openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.price)).toEqual([320]);
    expect(st().assetAccounts[0].positions[0].lots[0].cost_per_share).toBe(320);
    expect(screen.queryByText('Confirm your change')).toBeNull();
    holds('L', [['WHAT YOU BOUGHT Jul 30, 2026 100 sh @ $320.00 you entered this · Robinhood indicates $350.00', 'Robinhood indicates $350.00']]);
  });
  test('"Cancel" writes nothing: Robinhood’s $350 stays on the record and on the purchase', () => {
    stateK();
    const before = st().assetRecord.length;
    fireEvent.press(screen.getByText('Cancel'));
    expect([st().assetRecord.length, openPurchases(st().assetRecord, A, 'MSFT').map((p) => p.price), st().assetAccounts[0].positions[0].lots[0].cost_per_share]).toEqual([before, [350], 350]);
    expect(screen.queryByText('Confirm your change')).toBeNull();
  });
});

describe('the drawing, read (a guard must prove it looked)', () => {
  test('twelve states, A to L, each from its top bar to its last door', () => {
    expect(DRAWN.map((d) => d.label.slice(0, 7))).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((k) => `STATE ${k}`));
    for (const d of DRAWN) { expect(d.text.startsWith('‹ Back')).toBe(true); expect(d.text.endsWith('Record buy/sell Activity')).toBe(true); }
    expect(words(' a ( b ) , c ')).toBe('a (b), c');
  });
});
