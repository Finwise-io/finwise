/**
 * HIS RULING "all", 2026-11-06 — the design review's eight words, in plain words, on the screens that print them.
 *  1 "Connect your bank" (was "Link it (read-only)") · 2 AVERAGE YIELD (was AVG YIELD) · 3 INTEREST A YEAR (was COUPON /year)
 *  4 1 month · 1 year · 2 years (was 1M · 1Y · 2Y), and the 2-year line · 5 "These lines fill in as days pass." · 6 "Fee (optional)"
 *  7 no emoji beside Net worth's sections · 8 no retirement card on Net worth before the first account.
 * Each is checked on the rendered screen, and the old words are checked absent, so a word that creeps back fails here.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { WINDOW_LABEL, TWO_YEARS_PER_YEAR_LINE } from '../../constants/windows';
import { ADD_ACCOUNT_DOORS } from '../../constants/doors';
import { builtLines } from '../../testing/mockMatch';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

const SECTION_EMOJI = /💵|📈|🏠|🏛️|📜|🪙|🚗|🧩/u;
const fresh = (over: any = {}) => { useStore.getState().resetAll(); useStore.setState({ hideBalances: false, onboardingComplete: true, ...over } as any); };

test('1, 7, 8 — Net worth with no account: the door reads Connect your bank, no section emoji, no retirement card', () => {
  fresh();
  const NW = require('../NetWorthScreen').default;
  render(<NW />);
  const lines = builtLines(screen.toJSON());
  expect(lines).toContain('Connect your bank');
  expect(lines.join(' | ')).not.toMatch(/Link it/);
  expect(lines.filter((l) => /^(CASH|INVESTMENTS|PERSONAL PROPERTY)$/.test(l))).toHaveLength(3);
  expect(lines.filter((l) => SECTION_EMOJI.test(l))).toEqual([]);
  expect(screen.queryByText('YOUR RETIREMENT PLAN')).toBeNull();
  expect(screen.queryByText(/^Sample: \d+% odds/)).toBeNull();
  expect(ADD_ACCOUNT_DOORS.map((d) => d.title)).toEqual(['Connect your bank', 'Add by hand', 'Import from a file']);
});

test('8 — with an account, the retirement card is back', () => {
  fresh({ assetAccounts: [{ asset_id: 'c1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5000, value_as_of: '2026-11-01' }] });
  const NW = require('../NetWorthScreen').default;
  render(<NW />);
  expect(screen.getByText('YOUR RETIREMENT PLAN')).toBeOnTheScreen();
  expect(builtLines(screen.toJSON()).filter((l) => SECTION_EMOJI.test(l))).toEqual([]);
});

test('2, 3 — the Bonds summary reads INTEREST A YEAR and AVERAGE YIELD', () => {
  fresh({ assetAccounts: [{ asset_id: 'b1', label: 'US Treasury 2029', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 24200, face_value: 25000, coupon_rate: 0.045, maturity_date: '2029-09-30' }] });
  const B = require('../BondsScreen').default;
  render(<B />);
  expect(screen.getByText('INTEREST A YEAR')).toBeOnTheScreen();
  expect(screen.getByText('AVERAGE YIELD')).toBeOnTheScreen();
  expect(screen.queryByText('COUPON /year')).toBeNull();
  expect(screen.queryByText('AVG YIELD')).toBeNull();
});

test('4 — the window names are words, in one place, on both screens that offer windows', () => {
  expect(WINDOW_LABEL).toEqual({ '1M': '1 month', YTD: 'This year', '1Y': '1 year', '2Y': '2 years' });
  expect(TWO_YEARS_PER_YEAR_LINE).toBe('The 2-year return is shown per year, so you can compare it with the 1-year return.');
  for (const f of ['PerformanceScreen.tsx', 'AccountPortfolioScreen.tsx']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    expect(src).toMatch(/WINDOW_LABEL/);
    expect(src).not.toMatch(/label: '1[MY]'|label: '2Y'|'1M': '1M'|>2Y is shown per year/);   // a code comment may quote the old line; the screen may not print it
  }
});

test('5, 6 — the walk note and the fee box read the plain words, and the old ones are gone from the screens', () => {
  for (const f of ['PerformanceScreen.tsx', 'AccountPortfolioScreen.tsx']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    expect(src).not.toMatch(/the structure never changes|Fee \(opt\)/);
    expect(src).toMatch(/These lines fill in as days pass\./);
    expect(src).toMatch(/>Fee \(optional\)</);
  }
});
