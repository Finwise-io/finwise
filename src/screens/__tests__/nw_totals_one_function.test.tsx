/** ONE CONCEPT, ONE FUNCTION — the Net worth screen's totals (owner, DEC-0343, 2026-09-13).
 *
 *  His ruling: "a concept is computed by exactly one dependent function, called over whatever set it is asked about
 *  (total assets over all accounts, and over one institution's accounts, is the same function); a total and the sum of
 *  its parts are pinned by an invariant test, never assumed."
 *
 *  Until 2026-10-20 the screen added up each section and each institution by hand — the institutions with
 *  `balance || 0`, the sections with a check of their own. Both are MK-NW-F-039 buildAssetsState now, called over the
 *  section's or the institution's accounts, so an account with no value entered ("Value not entered", DEC-3657) is
 *  left out of every total the same way.
 *
 *  The household: linked accounts (one of them never synced a balance), typed accounts, and a CD whose value was
 *  never entered. What it owns, added by hand: $8,000 checking + $20,000 savings + $300,000 Vanguard + $150,000
 *  401(k) + $500,000 home + $20,000 car = $998,000. The CD and the Robinhood account have no value and count nowhere.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { buildAssetsState } from '../../domain/assets';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn() },
}));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const today = new Date().toISOString();

const ACCOUNTS = [
  { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },   // typed
  { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0.04 },   // typed
  { asset_id: 'cd', label: 'Ally CD', institution: 'Ally', kind: 'cd', asset_class: 'bonds', balance: undefined, target_return: 0.045 },   // no value entered
  { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 300000,   // linked
    target_return: 0.07, source: 'connected', last_synced: today, cash_balance: 1000,
    positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 250, price: 250, shares: 1196,
      lots: [{ lot_id: 'l1', shares: 1196, cost_per_share: 200, purchase_date: '2023-01-02' }] }] },
  { asset_id: 'rh', label: 'Robinhood', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: null,   // linked, no balance came
    target_return: 0.07, source: 'connected', last_synced: today },
  { asset_id: 'k401', label: 'Fidelity 401(k)', institution: 'Fidelity', kind: '401k', tax_bucket: 'PRE_TAX', balance: 150000, target_return: 0.07 },   // typed
  { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000, target_return: 0 },
  { asset_id: 'car', label: 'Car', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 20000, target_return: 0 },
];
const OWNS = 998000;   // added by hand in the header
const setup = (over: any = {}) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
    onboardingProfile: { status: 'employed', monthlySpending: '4000' }, assetAccounts: ACCOUNTS, liabilities: [], ...over } as any);
};
const money = (s: string) => Number(s.replace(/[^0-9.]/g, ''));
/** The spoken label of every band whose name is in `names`: "<name>, $X, N accounts. Collapses them." — the figure the band prints. */
const bandTotals = (names: string[]) => {
  const out: Record<string, number | null> = {};
  for (const n of names) {
    // a band's label ends "… Collapses them." — a class row's ends "… Collapses its N accounts.", so the two cannot be confused
    const el = screen.getByLabelText(new RegExp(`^${n.replace(/[()*]/g, '\\$&')}, [^]*(Collapses|Expands) them\\.$`));
    const m = String(el.props.accessibilityLabel).match(/^[^,]+, (\$[\d,]+|value not entered)/);
    out[n] = m && m[1] !== 'value not entered' ? money(m[1]) : null;
  }
  return out;
};
const whatYouOwn = () => figuresPrinted().filter((p) => p.id === 'MK-NW-M-004').map((p) => p.value);

test('the household adds up by hand, and the one function agrees: unvalued accounts are left out', () => {
  expect(buildAssetsState('t', ACCOUNTS as any).total_asset_value).toBe(OWNS);
});

test('BY INSTITUTION — the institutions add up to WHAT YOU OWN, and a bank with no value reads "Value not entered"', () => {
  setup(); resetFiguresPrinted(); render(<NetWorth />);
  fireEvent.press(screen.getByText('By institution'));
  const banks = ['Chase', 'Ally', 'Vanguard', 'Robinhood', 'Fidelity', 'No institution'];
  const t = bandTotals(banks);
  expect(Object.keys(t)).toHaveLength(6);                                        // the guard looked: six banks, each read
  expect(t).toEqual({ Chase: 8000, Ally: 20000, Vanguard: 300000, Robinhood: null, Fidelity: 150000, 'No institution': 520000 });
  const sum = Object.values(t).reduce((s: number, v) => s + (v ?? 0), 0);
  expect(sum).toBe(OWNS);
  expect(new Set(whatYouOwn())).toEqual(new Set([OWNS]));                         // WHAT YOU OWN is the same total
});

test('BY CATEGORY — Cash, Investments and Personal property add up to WHAT YOU OWN', () => {
  setup(); resetFiguresPrinted(); render(<NetWorth />);
  const t = bandTotals(['Cash', 'Investments', 'Personal property']);
  expect(Object.values(t).every((v) => v != null && v > 0)).toBe(true);           // the guard looked: three groups, each with money
  expect(Object.values(t).reduce((s: number, v) => s + (v ?? 0), 0)).toBe(OWNS);
  expect(t['Personal property']).toBe(520000);                                    // home + car
});

test('THE SECTIONS (the step-by-step setup) — Cash, Taxable, Retirement and Property add up to WHAT YOU OWN', () => {
  setup({ nwSetupChoice: 'guided' }); render(<NetWorth />);
  const sections: number[] = [];
  for (let step = 0; step < 4; step++) {
    const printed = figuresPrinted().filter((p) => p.id === 'MK-NW-M-006');
    sections.push(printed.length ? printed[printed.length - 1].value as number : 0);
    resetFiguresPrinted();
    fireEvent.press(screen.getByText('Next →'));
  }
  expect(sections).toHaveLength(4);                                               // the guard looked: four sections read
  expect(sections).toEqual([28000, 300000, 150000, 520000]);                      // the CD and Robinhood count in neither
  expect(sections.reduce((s, v) => s + v, 0)).toBe(OWNS);
});
