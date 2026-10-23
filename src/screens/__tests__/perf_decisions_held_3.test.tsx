/** HIS DECISIONS, READ AGAINST THE OTHER SCREENS PERFORMANCE OPENS — part 3 (PF-DECISIONS, 2026-10-22).
 *
 *  The Holding page (opened from the account page; it prints Performance's return against the market), What if, and the
 *  explanation card every ⓘ opens. Each decision below stood in the decision log as "RECORDED — status not established":
 *  nothing re-ran it. Each test renders the screen with a holding the way an account carries one (its purchases, its
 *  records, its price history) or a fresh account, and fails if the screen breaks the decision. Every test is named by
 *  the decision it holds.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import WhatIfScreen from '../WhatIfScreen';
import { InfoDot } from '../../components/UI';
import { useStore } from '../../store/useStore';
import { GLOSSARY } from '../../domain/glossary';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn() },
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** a daily-close history: 14 months back, 6 months back, yesterday, today */
const seriesFor = (start: number, end: number) => {
  const now = new Date();
  const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  return { points: [{ date: back(14), close: start }, { date: back(6), close: (start + end) / 2 }, { date: iso(new Date(Date.now() - 86400e3)), close: end * 0.99 }, { date: iso(now), close: end }] };
};
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
/** one brokerage at Fidelity: 100 VTI bought at $200, 10 of a ticker with no price at $50.125, 100 BND the person classed
 *  as a bond — and a $120 VTI dividend forty days ago */
function holdings() {
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false,
    assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [
        { position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf', asset_class: 'stock_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 200, purchase_date: '2024-01-12' }] },
        { position_id: 'zz', ticker: 'ZZZQ', kind: 'stocks_etf', asset_class: 'stock_etf', lots: [{ lot_id: 'l3', shares: 10, cost_per_share: 50.125, purchase_date: '2024-01-12' }] },
        { position_id: 'bnd', ticker: 'BND', kind: 'stocks_etf', asset_class: 'bond', class_source: 'user', lots: [{ lot_id: 'l2', shares: 100, cost_per_share: 70, purchase_date: '2024-01-12' }] },
      ] }],
    transactions: [{ id: 'v1', account_id: 'brk', type: 'DIVIDEND', ticker: 'VTI', amount: 120, date: iso(new Date(Date.now() - 40 * 86400e3)) }],
    priceCache: { VTI: { ticker: 'VTI', ...seriesFor(200, 240) }, BND: { ticker: 'BND', ...seriesFor(70, 72) },
      SPY: { ticker: 'SPY', ...seriesFor(100, 110) }, AGG: { ticker: 'AGG', ...seriesFor(95, 97) } },
    pricesFetchedAt: new Date().toISOString(),
  } as any);
}
const holding = (id: string) => { holdings(); mockParams = { account: 'brk', position: id }; render(<HoldingDetailScreen />); };

// ── DEC-0022 ─────────────────────────────────────────────────────────────────────────────────────────
// "holding screen - approved." The price leads, with a graph and buttons for the period under it; everything else is one
// kind of table; with no price, the headline shows what you PAID — never a made-up value. (Its "three decimal places for
// the average" is replaced by DEC-0264, 2026-09-09: a price or per-share figure prints two decimals.)
test('DEC-0022 — a priced holding: the latest close leads, the period buttons sit under it, then the table rows', () => {
  holding('vti');
  const all = lines();
  const head = all.findIndex((l) => /^LAST CLOSE · /.test(l));
  expect(head).toBeGreaterThan(0);
  expect(all[head + 1]).toBe('$240.00');
  const periods = all.slice(head + 3, head + 9);
  expect(periods).toEqual(['1M', '3M', '6M', 'YTD', '1Y', '2Y']);
  expect(all[head + 9]).toBe('Current value');                       // the table follows the buttons
});
test('DEC-0022 — a holding with no price: the headline says it shows what was paid, and the figure is the Total paid, never a made-up value', () => {
  holding('zz');
  const all = lines();
  const head = all.indexOf('NO LIVE PRICE — SHOWING WHAT YOU PAID');
  expect(head).toBeGreaterThan(0);
  expect(all[head + 1]).toBe(all[all.indexOf('Total paid') + 1]);   // $501 both: 10 × $50.125
  expect(all[head + 1]).toBe('$501');
  expect(all).toContain('$50.13');                                  // the average, two decimals (DEC-0264)
});

// ── DEC-0105 ─────────────────────────────────────────────────────────────────────────────────────────
// "info dot retirement has more information than what can fit on one screen but no scrolling feature." The card scrolls.
test('DEC-0105 — the explanation card an ⓘ opens holds its words in a scrolling view (the market comparison Performance\'s Holding page opens)', () => {
  render(<InfoDot term="benchmark" />);
  fireEvent.press(screen.getByLabelText(`What is ${GLOSSARY.benchmark.title}?`));
  const body = screen.getByText(GLOSSARY.benchmark.body);
  let p: any = body.parent, inScroll = false;
  while (p) { if (p.type === 'RCTScrollView' || p.type?.displayName === 'ScrollView' || p.type?.name === 'ScrollView') { inScroll = true; break; } p = p.parent; }
  expect(inScroll).toBe(true);
});

// ── DEC-0456 ─────────────────────────────────────────────────────────────────────────────────────────
// "'up $11,200 this month Triangle up' should be 'Triangle (green color) up $11,200 this month'." The direction comes first.
test('DEC-0456 — on the Holding page the triangle and its word come before the amount: "▲ up $2.40 (1.01%) today", "▲ +$4,000 (+20.00%)"', () => {
  holding('vti');
  const all = lines();
  expect(all).toContain('▲ up $2.40 (1.01%) today');
  expect(all[all.indexOf('Change since purchase') + 1]).toBe('▲ +$4,000 (+20.00%)');
  expect(all.filter((l) => /\$[\d,.]+.*[▲▼]/.test(l))).toEqual([]);  // never an amount with its triangle after it
});

// ── DEC-0458 ─────────────────────────────────────────────────────────────────────────────────────────
// "Benchmark in S&P 500? If that add info dot." Where a figure is compared with a benchmark, the screen names WHICH one,
// behind a tappable explanation.
test('DEC-0458 — a stock is set beside the stock market, and its ⓘ names the S&P 500', () => {
  holding('vti');
  const all = lines();
  expect(all).toContain('VS THE STOCK MARKET · SAME DATES');
  expect(all[all.indexOf('The market, same dates') + 1]).toBe('+10.00%');   // SPY 100 → 110 over the same year
  expect(screen.getAllByLabelText(`What is ${GLOSSARY.benchmark.title}?`).length).toBeGreaterThan(0);
  expect(GLOSSARY.benchmark.body).toMatch(/the S&P 500/);
});
// The audit's row 4 (2026-10-21) found this band calling AGG "the stock market"; on 2026-10-22 the Holding page names the
// yardstick it measures against (MK-NW-F yardstickName, the names of his Look back ruling, DEC-1624).
test('DEC-0458 — a holding the person classed as a bond is set beside the bond market (AGG), and the band names the bond market', () => {
  holding('bnd');
  const all = lines();
  expect(all[all.indexOf('The market, same dates') + 1]).toBe('+2.11%');    // AGG 95 → 97 over the same year
  expect(all).toContain('VS THE BOND MARKET · SAME DATES');
  expect(all.filter((l) => /STOCK MARKET/.test(l))).toEqual([]);
});

// ── DEC-0479 and DEC-0483 (the Holding page's half) ─────────────────────────────────────────────────
// "Is there any place we display realized P/L, unrealized P/L, total dividend, and total interest separately?" and
// "stocks with dividends — will it also show dividends received?"
test('DEC-0479 · DEC-0483 — the Holding page shows what the holding paid you, what was realized from sales, and the gain if sold today, each on its own line', () => {
  holding('vti');
  const all = lines();
  expect(all[all.indexOf('Dividends received (trailing twelve months)') + 1]).toBe('$120');
  expect(all[all.indexOf('Realized from sales') + 1]).toBe('$0 — nothing sold');
  expect(all).toContain('IF YOU SOLD TODAY');
  expect(all[all.indexOf('Gain — long-term (held over 1 yr)') + 1]).toBe('+$4,000');  // unrealized: 100 × ($240 − $200)
});

// ── DEC-0001 ─────────────────────────────────────────────────────────────────────────────────────────
// "What if I save more?" redrawn: age and retire-at are sliders on the screen and save to the one plan; the difference and
// the nest egg each carry an ⓘ; the screen no longer asks for the plan first. (What if is the Plan module's screen; its
// back arrow names Performance in the look-ahead drawing, so it is read here too.)
test('DEC-0001 — with an account and no plan filled in, What if shows its answer at once, with the two sliders and an ⓘ on the difference and on the nest egg', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 300_000, target_return: 0.06, retirement_pct: 100 }] } as any);
  mockParams = {};
  render(<WhatIfScreen />);
  const all = lines();
  expect(all).toContain('ABOUT YOU — SAVED TO YOUR PLAN');
  expect(all).toContain('Your age');
  expect(all).toContain('Retire at');
  expect(all.filter((l) => /^AT \d+ \(ESTIMATES\)$/.test(l))).toHaveLength(1);   // the answer, without a plan first
  expect(all).toContain('Projected nest egg');
  expect(screen.getAllByLabelText(`What is ${GLOSSARY.nestEggMath.title}?`)).toHaveLength(2);
});
test('DEC-0001 — a fresh account: What if asks only for an account, never for the plan first', () => {
  useStore.getState().resetAll();
  mockParams = {};
  render(<WhatIfScreen />);
  const all = lines();
  expect(all).toContain('Connect or add an account ›');
  expect(all.filter((l) => /plan first|fill in your plan|plan basics/i.test(l))).toEqual([]);
});
