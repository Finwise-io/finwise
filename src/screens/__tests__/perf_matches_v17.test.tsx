/** THE PERFORMANCE TAB AGAINST ITS APPROVED DRAWING, WORD FOR WORD (Performance v17, approved in full
 *  2026-10-01 — phones 1, 3, 4 and 5; phone 2 is the Account portfolio and has its own test).
 *
 *  Method (the mock-match standing order): take every visible word on a phone of the drawing, in
 *  order; render the screen in that phone's data state and take every visible word, in order; the two
 *  must be the SAME stream. Figures, dates and account names are data, so each is compared as a
 *  token — "$123,000" and "$52,704" are both "a dollar amount here".
 *
 *  What this cannot see, said plainly: colours, sizes, spacing, and the graph's axis (drawn by SVG
 *  after layout, which a test render never reaches — phones 4 and 5 draw the day-one frame in plain
 *  text and ARE compared). The three places the screen knowingly differs are named in KNOWN below,
 *  each with its reason; nothing else is exempt.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { ruledHtml } from '../../testing/ruledSince';
import { isoLocalDate } from '../../domain/_shared/dates';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
const TODAY = isoLocalDate(new Date());
const series = (ticker: string, from: number, to: number, start: string) => ({ ticker, points: [{ date: start, close: from }, { date: TODAY, close: to }] });
const day = (date: string, rows: [string, string, number, number][]) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
  holdings: rows.filter((r) => r[1] !== 'CASH').map(([accountId, securityKey, units, value]) => ({ date, accountId, securityKey, symbol: securityKey, units, price: value / units, value, currency: 'USD' })),
  accounts: [...new Set(rows.map((r) => r[0]))].map((accountId) => ({ date, accountId, cash: rows.filter((r) => r[0] === accountId && r[1] === 'CASH').reduce((t, r) => t + r[3], 0), statedTotal: rows.filter((r) => r[0] === accountId).reduce((t, r) => t + r[3], 0), typedValue: null, currency: 'USD' })),
});
/** A daily record from `start` to today: each account's holdings move in a straight line from its first to its last value. */
function daily(start: string, lines: [string, string, number, number, number][]): any[] {
  const out: any[] = []; const a = new Date(`${start}T12:00:00`); const b = new Date(`${TODAY}T12:00:00`);
  const n = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
  for (let i = 0; i <= n; i += 1) {
    const d = new Date(a.getTime() + i * 86_400_000); const date = isoLocalDate(d);
    out.push(day(date, lines.map(([acc, key, units, v0, v1]) => [acc, key, units, v0 + (v1 - v0) * (i / n)] as [string, string, number, number])));
  }
  return out;
}
/** Money paid in (or taken out) shows in the record from that day on — the record holds each day's value AFTER its money moved. */
function paidIn(days: any[], accountId: string, key: string, from: string, amount: number): any[] {
  return days.map((d) => (d.date < from ? d : {
    ...d,
    holdings: d.holdings.map((h: any) => (h.accountId === accountId && h.securityKey === key ? { ...h, value: h.value + amount, price: (h.value + amount) / h.units } : h)),
    accounts: d.accounts.map((a: any) => (a.accountId === accountId && key === 'CASH' ? { ...a, cash: a.cash + amount } : a)),
  }));
}
const monthsAgo = (m: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setMonth(d.getMonth() - m); return isoLocalDate(d); };
const acct = (id: string, institution: string, label: string, balance: number, source: string | undefined, positions: any[], cash = 0) => ({
  asset_id: id, label, institution, kind: 'brokerage', tax_bucket: 'TAXABLE', balance, target_return: 0.05, source, cash_balance: cash,
  last_synced: source ? new Date().toISOString() : undefined, positions,
});
const pos = (id: string, ticker: string, shares: number, price: number, cost: number, date: string, cls = 'stock_etf') => ({ position_id: id, ticker, asset_class: cls, last_price: price, lots: [{ lot_id: `${id}l`, shares, cost_per_share: cost, purchase_date: date }] });

const STATES: Record<number, () => void> = {
  // phone 1 — two linked accounts, a record that begins 1 Oct 2025, money added
  // ONE HOUSEHOLD THAT AGREES WITH ITSELF (2026-10-25, the D17 class). The $15,000 paid in went into VTI's value with no share
  // bought, and the prices ($260 → $330 on 300 VTI, +$21,000) said what the record's own values ($78,000 → $84,000) did not. The
  // record's accounts are what v17 phone 1 draws, so they are the true ones: Vanguard $80,000 → $101,000 with $15,000 paid in,
  // dividends $1,500, interest $200, change in investment value $4,300; E*TRADE $20,000 → $22,000. Every flow now moves the cash
  // (+$15,000 ten months ago, +$1,700 and +$500 of dividends and interest three months ago) and each holding moves only by its
  // price: VTI 200 × $390.00 = $78,000 → 200 × $411.50 = $82,300; VOO 40 × $427.50 = $17,100 → 40 × $465.00 = $18,600, the
  // figure-exact household's own shares and prices (perf_mock_match_2026_10_12, phone 1). Stocks / Funds +6.10%, as drawn.
  1: () => useStore.setState({
    assetAccounts: [acct('van', 'Vanguard', 'BROKERAGE', 101_000, 'connected', [pos('p1', 'VTI', 200, 411.5, 390, monthsAgo(11))], 18_700),
                    acct('etr', 'E*TRADE', 'ACCOUNT 1', 22_000, 'connected', [pos('p2', 'VOO', 40, 465, 427.5, monthsAgo(11))], 3_400)],
    transactions: [
      { id: 'd1', date: monthsAgo(10), type: 'DEPOSIT', account_id: 'van', amount: 15_000, created_at: 'x', source: 'connected' },
      { id: 'v1', date: monthsAgo(3), type: 'DIVIDEND', account_id: 'van', ticker: 'VTI', amount: 1_500, created_at: 'x', source: 'connected' },
      { id: 'i1', date: monthsAgo(3), type: 'INTEREST', account_id: 'van', amount: 200, created_at: 'x', source: 'connected' },
      { id: 'v2', date: monthsAgo(3), type: 'DIVIDEND', account_id: 'etr', ticker: 'VOO', amount: 300, created_at: 'x', source: 'connected' },
      { id: 'i2', date: monthsAgo(3), type: 'INTEREST', account_id: 'etr', amount: 200, created_at: 'x', source: 'connected' },
    ],
    snapshotDays: paidIn(paidIn(paidIn(daily(monthsAgo(11), [['van', 'VTI', 200, 78_000, 82_300], ['van', 'CASH', 1, 2_000, 2_000], ['etr', 'VOO', 40, 17_100, 18_600], ['etr', 'CASH', 1, 2_900, 2_900]]),
      'van', 'CASH', monthsAgo(10), 15_000), 'van', 'CASH', monthsAgo(3), 1_500 + 200), 'etr', 'CASH', monthsAgo(3), 300 + 200),
    invDaily: { [monthsAgo(11)]: 100_000, [TODAY]: 123_000 },
    priceCache: { VTI: series('VTI', 390, 411.5, monthsAgo(11)), VOO: series('VOO', 427.5, 465, monthsAgo(11)) }, pricesFetchedAt: new Date().toISOString(),
  } as any),
  // phone 3 — one linked account, 26 months of record: every window answers
  3: () => {
    // ONE HOUSEHOLD THAT AGREES WITH ITSELF (2026-10-25, the D17 class). It paid in $900 and took out $120 where phone 3 draws
    // $9,000 and $1,200; its cash drifted $5,000 → $4,924 for no reason; and its $1,180 of dividends and $520 of interest landed
    // nowhere. The record phone 3 draws is the true one: $38,000 → $52,704, $9,000 paid in, $1,200 taken out, dividends $1,180,
    // interest $300 + $220, change in investment value $5,204, Stocks / Funds +14.20%. So every flow moves the cash, VTI moves
    // only by its price, the Treasury is $3,000 with no price history, and the prices agree with the record on every day both
    // hold one (the record's first day, the day of the purchase, today). Worked by hand:
    //   VTI $366.48 a share until the purchase, then in a straight line to $418.52 (418.52 ÷ 366.48 − 1 = +14.20%); 80 held,
    //   20 bought with the $9,000 the day it came in, at $366.48 ($7,329.60), so 100 today;
    //   the cash: $5,681.60 + $9,000 − $7,329.60 − $1,200 + $1,180 + $300 + $220 = $7,852;
    //   the beginning 80 × 366.48 + 3,000 + 5,681.60 = $38,000; today 100 × 418.52 + 3,000 + 7,852 = $52,704;
    //   change in investment value 41,852 − 29,318.40 − 7,329.60 = $5,204 (the Treasury does not move).
    const S = monthsAgo(26), D = monthsAgo(20), P0 = 366.48, PT = 418.52, Q = 20 * P0;
    const a = new Date(`${D}T12:00:00`).getTime(), b = new Date(`${TODAY}T12:00:00`).getTime();
    const price = (d: string) => (d <= D ? P0 : P0 + (PT - P0) * ((new Date(`${d}T12:00:00`).getTime() - a) / (b - a)));
    const cash = (d: string) => 5_681.6 + (d >= D ? 9_000 - Q : 0) - (d >= monthsAgo(14) ? 1_200 : 0) + (d >= monthsAgo(10) ? 1_180 : 0)
      + (d >= monthsAgo(8) ? 300 : 0) + (d >= monthsAgo(6) ? 220 : 0);
    const days: any[] = [];
    for (let t = new Date(`${S}T12:00:00`).getTime(); t <= b + 1; t += 86_400_000) {
      const date = isoLocalDate(new Date(t)); const units = date >= D ? 100 : 80;
      days.push(day(date, [['etr', 'VTI', units, units * price(date)], ['etr', 'US TREASURY 4.25%', 3000, 3_000], ['etr', 'CASH', 1, cash(date)]]));
    }
    const vti = { position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: PT,
      lots: [{ lot_id: 'p1a', shares: 80, cost_per_share: 260, purchase_date: S }, { lot_id: 'p1b', shares: 20, cost_per_share: P0, purchase_date: D }] };
    return useStore.setState({
    assetAccounts: [acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, 'connected', [vti, pos('p2', 'US TREASURY 4.25%', 3000, 1, 1, S, 'bond')], cash(TODAY))],
    transactions: [
      { id: 'd1', date: D, type: 'DEPOSIT', account_id: 'etr', amount: 9_000, created_at: 'x', source: 'connected' },
      { id: 't1', date: D, type: 'BUY', account_id: 'etr', ticker: 'VTI', shares: 20, price: P0, amount: Q, created_at: 'x', source: 'connected' },
      { id: 'w1', date: monthsAgo(14), type: 'WITHDRAWAL', account_id: 'etr', amount: 1_200, created_at: 'x', source: 'connected' },
      { id: 'v1', date: monthsAgo(10), type: 'DIVIDEND', account_id: 'etr', ticker: 'VTI', amount: 1_180, created_at: 'x', source: 'connected' },
      { id: 'b1', date: monthsAgo(8), type: 'INTEREST', account_id: 'etr', ticker: 'US TREASURY 4.25%', amount: 300, created_at: 'x', source: 'connected' },
      { id: 'i1', date: monthsAgo(6), type: 'INTEREST', account_id: 'etr', amount: 220, created_at: 'x', source: 'connected' },
    ],
    snapshotDays: days,
    invDaily: { [S]: 38_000, [TODAY]: 52_704 }, rebuiltFrom: { etr: S },
    priceCache: { VTI: { ticker: 'VTI', points: [{ date: S, close: P0 }, { date: D, close: P0 }, { date: TODAY, close: PT }] } }, pricesFetchedAt: new Date().toISOString(),
  } as any);
  },
  // phone 4 — day one, two hand-entered accounts, nothing recorded before today
  // DAY ONE AS THE APP HAS IT: Home writes today's values to the daily record the moment it opens (captureDailyNw), so on
  // day one the record exists and begins today. Every earlier window is one the record cannot reach — greyed until
  // 2026-10-13 (DEC-3035i), now worked back from each holding's price history (DEC-5291; KNOWN 10).
  4: () => {
    const accounts = [acct('van', 'Vanguard', 'BROKERAGE', 301_610, undefined, [pos('p1', 'VTI', 900, 330, 300, TODAY), pos('p3', 'KEYBANK CD 4.00%', 4610, 1, 1, TODAY, 'bond')], 0),
                      acct('etr', 'E*TRADE', 'ACCOUNT 1', 52_704, undefined, [pos('p2', 'VOO', 90, 550, 500, TODAY)], 3_204)];
    return useStore.setState({
    assetAccounts: accounts,
    transactions: [], snapshotDays: [buildDayFromAccounts(accounts as any, TODAY, `${TODAY}T09:00:00Z`)], invDaily: {},
    priceCache: { VTI: series('VTI', 330, 330, TODAY), VOO: series('VOO', 550, 550, TODAY) }, pricesFetchedAt: new Date().toISOString(),
  } as any);
  },
  // phone 5 — no accounts yet
  5: () => useStore.setState({ assetAccounts: [], transactions: [], snapshotDays: [], invDaily: {}, priceCache: {} } as any),
};

const MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
/** One stream of words: figures, dates and account names become tokens; glyphs that are not words go. */
const norm = (lines: string[]) => lines.join(' ').toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\p{Extended_Pictographic}|️|[ⓘ›↺·]/gu, ' ')
  .replace(/vanguard brokerage|e\*trade account 1|e\*trade brokerage/g, '<account>')
  .replace(new RegExp(`${MON} \\d{1,2}(, \\d{4})?`, 'g'), '<date>')
  .replace(/[−-]?\$[\d,]+(\.\d+)?/g, '$#').replace(/[+−-]?\d+(\.\d+)?%/g, '#%').replace(/\d+/g, '#')
  .replace(/\s+/g, ' ').trim();

/** THE KNOWN DIFFERENCES — each is a decision, written where the comparison is made.
 *  1. A yearly rate on a category row. The drawing prints one for cash and for bonds ("2.50%/year"). Settled by the
 *     drawing's dated line of 2026-10-25 (MM-PF D7): Cash in this account is a dash — the app holds no rate for cash, as
 *     his approved account-page drawing v01 rules (row 17, DEC-6457); Bonds & CDs is the bonds' price change plus the
 *     interest they paid (DEC-6212) where the app holds their prices — written with its sign, never "/year" over Since
 *     (Q49) — and a dash where it holds none (DEC-5068, tenet 3), as here: this household's Treasury has no prices.
 *     A bond held as its own account states its rate and DOES print "/year" — tested below; the measured figure is
 *     held in perf_mock_match_2026_10_12 (D7, +10.00% on both pages).
 *  2. The closed account line. Phone 1 reads "Linked · wealth generated $2,000 · return +10.00%";
 *     phone 3 reads "Linked · wealth generated $6,904 since Jun 3, 2024". One line cannot be worded
 *     two ways; phone 1's is the one v17 marks as new (its "return +10.00%" carries the drawing's dashed mark), so
 *     it is the one built — the drawing's dated line of 2026-10-25 (MM-PF D9) says so. Its source is the label, as
 *     on an open account (MM-PF D4, D21); the label's glyph and its "·" are not words, so the stream is unchanged.
 *  3. The graph's axis on phones 1 and 3 (see the header).
 *
 *  AND THE OWNER'S DECISION OF 2026-10-04 (DEC-1669), newer than this drawing: "All return should be
 *  True Weighted Return and not Dietz return." The drawing was made for the method before it, so the
 *  app differs from the drawing in these four places, each by that decision:
 *  4. The word. The drawing says "money-weighted, so money you added never counts as return"; the
 *     app says "time-weighted, so …".
 *  5. Mark 16 is gone. Phone 1 draws a money-weighted rate per year standing in where the old return
 *     refused, with the sentence "Money moved in and out in amounts where WHEN it moved would decide a
 *     window return, so this is your rate per year, counting when you added money". A time-weighted
 *     return does not refuse because money was added, so the summary reads the ordinary note …
 *  6. … and the same sentence under the open account's source line is not shown at all.
 *  7. With no stand-in there is no "/year" on the Since figure or on the open account's Return row.
 *     ("/year" on a category's yearly rate stays — that is difference 1's line, a different figure.)
 *  AND HIS DECISION OF 2026-10-13 (DEC-5136), newer than this drawing: "HOW $38,000 BECAME $52,704 · ALL ACCOUNTS -
 *  this is the title. Not - "How xxx stands. ALl Accounts"".
 *  8. The day-one walk (phones 4 and 5) is titled "HOW $354,314 BECAME $354,314 · ALL ACCOUNTS", not "HOW TODAY'S VALUE
 *     STANDS · ALL ACCOUNTS" with the value beside it.
 *  AND HIS APPROVAL OF 2026-10-13 (DEC-5291, "approved."), newer than this drawing: "Let price history count. When a
 *  period starts before the daily record, work it back from each holding's price history and name what's left out,
 *  rather than greying it."
 *  9. Phone 1's 1Y and 2Y, drawn greyed "—", carry figures worked back from VTI's and VOO's price history, and 2Y's
 *     line "The 2-year return is shown per year, so you can compare it with the 1-year return." follows them (phone 1's record begins Oct 1, 2025).
 *  10. Phone 4's 1M, This year, 1Y and 2Y, drawn greyed "—", carry figures (each holding was bought inside the window,
 *     so its gain is its value less its cost), with the 2Y line; and its day-one line reads, in his words of 2026-10-14
 *     (DEC-5425, "approved."): "You added your accounts today. Figures for 1 month, 1 year and longer come from each holding's
 *     past prices."
 *     Phone 5 (nothing entered) is unchanged: there is no holding with a history, so its windows stay "—".
 *  AND v17's ROW OF 2026-11-01 (the lead's ruling R20, NW4-03, under DEC-0237 and DEC-0404: "DRAWING CORRECTION, the 2Y window chip"):
 *  11. The 2Y chip's figure is a yearly rate and says so: "+7.30%/year" where "+7.30%" is drawn (a dash stays a dash). */
const MARK_16 = 'money moved in and out in amounts where when it moved would decide a window return, so this is your rate per year, counting when you added money';
const KNOWN = (s: string) => s
  .replace(/(bonds & cds|cash in this account) \$# (#%\/year|—)/g, '$1 $# <rate or dash>')
  .replace(/linked wealth generated \$# since <date>/g, 'linked wealth generated $# return #%')
  .replace(/money-weighted, so money you added/g, 'time-weighted, so money you added')                                                        // 4
  .replace(MARK_16, 'return is for the window you picked (<date> → <date>) — not a yearly rate time-weighted, so money you added never counts as return')   // 5 — the first, in the summary
  .replace(new RegExp(` ${MARK_16.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '')                                                          // 6 — the second, in the account's walk
  .replace(/since <date> #%\/year/g, 'since <date> #%').replace(/\breturn #%\/year/g, 'return #%')                                         // 7
  .replace(/how today's value stands all accounts \$#/g, 'how $# became $# all accounts')                                               // 8
  // 9, 10 and 11 in the window buttons' words of 2026-11-06 (his ruling "all"): the drawing is read ruled, so both sides say
  // "1 month", "1 year", "2 years" and the new 2-year line
  .replace(/^(performance <date> since <date> #% # month #% this year #% )# year — # years — summary/, '$1# year #% # years #% the #-year return is shown per year, so you can compare it with the #-year return. summary')   // 9 (phone 1)
  .replace(/^(performance <date> since today — )# month — this year — # year — # years — summary/, '$1# month #% this year #% # year #% # years #% the #-year return is shown per year, so you can compare it with the #-year return. summary')   // 10 (phone 4)
  .replace("you added your accounts today. your return starts measuring from today. we never back-fill a year we didn't see. $# your line",
    "you added your accounts today. figures for # month, # year and longer come from each holding's past prices. $# your line")   // 10 (words: DEC-5425)
  .replace(/(# years #%)( the #-year return is shown per year)/g, '$1/year$2');   // 11 (R20, v17 row of 2026-11-01): the drawn 2Y chip reads '/year'; the built one already does

const CHROME = new Set(['9:41', '▦ Menu', 'Money', 'Keel', '◉', '⚙', '🏠', 'Home', '💎', 'Net worth', '📈', '💵', 'Cash flow', '🧭', 'Plan']);
function drawn(n: number): string[] {
  const p = path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_performance_v17.html');
  // read with his rulings made after it was drawn (2026-11-06, ruledSince)
  let body = ruledHtml(p, fs.readFileSync(p, 'utf8')).replace(/^[\s\S]*<body/, '<body').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  // the graph: its SVG gridline labels go; the day-one frame's own words ("your line starts today") stay
  body = body.replace(/<svg[\s\S]*?<\/svg>/g, (svg) => (/your line starts/.test(svg) ? svg : ''));
  const lines = body.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const starts = lines.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
  expect(starts.length).toBe(5);                                     // the guard proves it looked: five phones
  const seg = lines.slice(starts[n - 1], starts[n] ?? lines.length);
  const end = seg.findIndex((l, k) => /^🏠/.test(l) && k > 10);      // the tab bar closes the phone
  expect(end).toBeGreaterThan(20);                                   // and the phone has a body
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
}
function built(): string[] {
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
/** Where two streams part, with the words either side — a failure has to say WHERE. */
function firstDifference(a: string, b: string): string {
  const x = a.split(' '), y = b.split(' ');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i += 1;
  if (i === x.length && i === y.length) return '';
  return `at word ${i}:\n  DRAWN … ${x.slice(Math.max(0, i - 8), i + 14).join(' ')}\n  BUILT … ${y.slice(Math.max(0, i - 8), i + 14).join(' ')}`;
}

describe('the Performance tab says what Performance v17 draws, word for word', () => {
  test('KNOWN 11 stands on v17\'s row of 2026-11-01 (R20), written on the drawing', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_performance_v17.html'), 'utf8');
    expect(html).toMatch(/2026-11-01<\/td>(?:(?!<\/tr>)[\s\S])*DRAWING CORRECTION, the 2Y window chip/);
  });
  // the graph's axis dates sit under a drawn line on phones 1 and 3 only
  const AXIS: Record<number, RegExp | null> = { 1: /<date> ?<date> (?=how \$# became)/, 3: /<date> ?<date> (?=how \$# became)/, 4: null, 5: null };
  test.each([
    [1, 'two linked accounts, money added: the return is time-weighted, and the money added is not in it'],
    [3, 'one linked account with 26 months of rebuilt record: every window answers'],
    [4, 'day one, two accounts entered by hand'],
    [5, 'no accounts yet'],
  ])('phone %i — %s', (n) => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true); useStore.setState({ hideBalances: false } as any);
    STATES[n as number]();
    render(<PerformanceScreen />);
    let want = KNOWN(norm(drawn(n as number)));
    if (AXIS[n as number]) want = want.replace(AXIS[n as number]!, '');
    const got = KNOWN(norm(built()));
    expect(want.split(' ').length).toBeGreaterThan(60);              // a phone that read as empty would pass anything
    expect(firstDifference(want, got)).toBe('');
    screen.unmount();
  });

  test('a bond held as its own account states its yearly rate, and the category row prints it with /year', () => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true); useStore.setState({ hideBalances: false } as any);
    STATES[1]();
    useStore.setState({
      assetAccounts: [...(useStore.getState() as any).assetAccounts,
        { asset_id: 'cd', label: 'KeyBank CD 4.00%', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 5_000, target_return: 0.04, coupon_rate: 0.04, maturity_date: '2027-08-24' }],
      transactions: [...(useStore.getState() as any).transactions,
        { id: 'c1', date: monthsAgo(2), type: 'INTEREST', account_id: 'cd', ticker: 'KeyBank CD 4.00%', amount: 100, created_at: 'x' }],
    } as any);
    render(<PerformanceScreen />);
    expect(built().join(' | ')).toMatch(/Bonds & CDs \| \$100 \| \+4\.00%\/year/);
    screen.unmount();
  });
});
