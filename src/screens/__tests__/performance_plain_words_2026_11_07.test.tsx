/**
 * HIS RULING "Change words to recommended", 2026-11-07 — the design review's Performance list of eight, on the screens that print them.
 *  1 "Ending market value" is the one name (was "Ending value" on the summary, "Market value" on the account page)
 *  2 "Money you added or took out is not counted as gain" (was "time-weighted, so money you added never counts as return")
 *  3 "— a rate per year, so you can compare it with one year." (was "— a yearly rate, so it sits fairly beside a one-year window.")
 *  4 "Return is for these dates (… → …) — not a rate per year" · 5 "Earned = dividends and interest paid to you between these dates"
 *  6 "tap the name to open this account's page ›" · 7 a Refresh prices button · 8 a line saying how the Return was calculated.
 * The old words are checked absent from both screens, so a word that creeps back fails here.
 */
import * as fs from 'fs';
import * as path from 'path';
import { howReturnCalculated } from '../../../MoneyKeel/functions/networth-and-performance/performance';
import { figLabel } from '../../components/figure';

const SCREENS = ['PerformanceScreen.tsx', 'AccountPortfolioScreen.tsx'];
const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const pct = (v: number) => `${v >= 0 ? '+' : '−'}${(Math.abs(v) * 100).toFixed(2)}%`;

test('the coverage: both screens are read', () => {
  expect(SCREENS.map((f) => src(f).length).every((n) => n > 10_000)).toBe(true);
});

test('1 — one name for the ending value, on the figure records and on both screens', () => {
  expect(figLabel('MK-PF-M-001')).toBe('Ending market value');
  expect(figLabel('MK-NW-M-018')).toBe('Ending market value');
  expect(src('PerformanceScreen.tsx')).toMatch(/<Text style=\{styles\.sumLbl\}>Ending market value<\/Text>/);
  expect(src('AccountPortfolioScreen.tsx')).toMatch(/<Text style=\{p\.trioL\}>Ending market value<\/Text>/);
  for (const f of SCREENS) expect(src(f)).not.toMatch(/>Ending value<|>Market value<|`Ending value, /);
});

test('2 to 6 — the plain words are printed, and the old ones are gone from both screens', () => {
  const all = SCREENS.map(src).join('\n');
  for (const said of ['Money you added or took out is not counted as gain', ' — a rate per year, so you can compare it with one year.',
    'Return is for these dates (', ') — not a rate per year']) expect(all).toContain(said);
  expect(src('PerformanceScreen.tsx')).toContain('Earned = dividends and interest paid to you between these dates');
  expect(src('PerformanceScreen.tsx')).toContain('tap the name to open this account’s page ›');
  for (const old of ['time-weighted, so money you added', 'sits fairly beside a one-year window', 'the window you picked', 'received in this window',
    'account’s portfolio', ' · time-weighted`']) expect(all).not.toContain(old);
});

test('3 — the Holding page says the same yearly-rate sentence', () => {
  const h = src('HoldingDetailScreen.tsx');
  expect(h).toContain(' — a rate per year, so you can compare it with one year.');
  expect(h).not.toContain('sits fairly beside a one-year window');
});

test('7 — the out-of-date prices line carries a Refresh prices button that asks for prices, as pulling down does', () => {
  const s = src('PerformanceScreen.tsx');
  expect(s).toMatch(/testID="refresh-prices" onPress=\{refresh\}/);
  expect(s).toMatch(/accessibilityLabel="Refresh prices"/);
  expect(s).toMatch(/<RefreshControl refreshing=\{loading\} onRefresh=\{refresh\}/);   // the gesture stays
});

test('8 — how the Return was calculated, in his own case: two pieces, +6.20% and +4.49%, make +10.97%', () => {
  const pieces = [{ growth: 212_400 / 200_000 - 1 }, { growth: 284_630 / 272_400 - 1 }];
  const total = pieces.reduce((g, p) => g * (1 + p.growth), 1) - 1;
  expect(howReturnCalculated(pieces, total, pct)).toBe('How it is calculated: money went in or out on 1 day, so these dates are split there into 2 pieces — +6.20% and +4.49%. Multiplied together before rounding, they make +10.97%.');
  expect(howReturnCalculated([{ growth: 0.05 }], 0.05, pct)).toBe('How it is calculated: no money went in or out between these dates, so Return is how much the value changed, +5.00%.');
  const many = Array.from({ length: 6 }, () => ({ growth: 0.01 }));
  expect(howReturnCalculated(many, 1.01 ** 6 - 1, pct)).toBe('How it is calculated: money went in or out on 5 days, so these dates are split there into 6 pieces; each piece’s growth is measured, and the 6 are multiplied together, before rounding, to make +6.15%.');
  expect(howReturnCalculated(null, 0.1, pct)).toBeNull();
  expect(howReturnCalculated(pieces, null, pct)).toBeNull();
  for (const f of SCREENS) expect(src(f)).toMatch(/howReturnCalculated\(now\??\.pieces/);
});
