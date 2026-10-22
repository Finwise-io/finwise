/** HOW OFTEN A BOND HELD INSIDE AN ACCOUNT PAYS (2026-10-21, decided under his ruling DEC-3390; MK-XS-I-069).
 *
 *  A bond held as its own account is asked "Pays interest" — Once a year · Twice a year — on Add an account and on the Bonds
 *  editor (2026-10-20). A bond held INSIDE an account, edited on the holding editor (classed Bonds & CDs), was asked its face
 *  value, rate and maturity but not this, so the estimate of interest earned since the last payment — which its yield to
 *  maturity adds — always assumed one payment a year. Drawn first: READ THIS FIRST row of 2026-10-21 on Holding detail v02.
 *
 *  Held here: the same words and the same choices as the two forms, nothing chosen until tapped, the saved answer shown when the
 *  editor opens again, never asked of a CD or a stock, saved on the holding as 1 or 2, and read by the line under the bond on its
 *  account page (face · rate · YTM · matures). The drawing's worked example is computed by the app's own estimate.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { holdingBondFacts } from '../../../MoneyKeel/functions/networth-and-performance/bonds';
import { bondInfo, estimatedAccrued } from '../../domain/bonds';
import { COUPONS_PER_YEAR_QUESTION, COUPONS_PER_YEAR_CHOICES } from '../../constants/couponsPerYear';
import { fig } from '../../components/figure';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useSegments: () => [],
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));

const TODAY = '2026-10-21';
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

const { HoldingEditor } = require('../PerformanceScreen');
const HoldingDetailScreen = require('../HoldingDetailScreen').default;
const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
const st = () => useStore.getState() as any;

// the drawing's worked example: $10,000 face at 4.00%, maturing Mar 15, 2030, held at Fidelity, 100 units at $98.50
const BOND = { position_id: 'p1', ticker: '91282CXX0', label: 'US Treasury 2030', kind: 'fixed_income', asset_class: 'bond', last_price: 98.5,
  face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-03-15',
  lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 98, purchase_date: '2025-01-05' }] };
const CD = { position_id: 'p2', ticker: '49306SAB2', label: 'KeyBank CD', kind: 'cd', asset_class: 'bond', last_price: 100,
  face_value: 5_000, coupon_rate: 0.04, maturity_date: '2027-03-31', lots: [{ lot_id: 'l2', shares: 50, cost_per_share: 100, purchase_date: '2026-04-02' }] };
const STOCK = { position_id: 'p3', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l3', shares: 3, cost_per_share: 200, purchase_date: '2026-01-05' }] };
const account = (positions: any[]) => ({ asset_id: 'brk', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 9_850, source: 'connected', last_synced: `${TODAY}T08:00:00Z`, positions });
const editor = (position: any) => {
  const onSave = jest.fn();
  const r = render(<HoldingEditor open accounts={[account([position])]} existing={{ accountId: 'brk', position }} onClose={jest.fn()} onSave={onSave} />);
  return { onSave, r };
};
const SPOKEN = COUPONS_PER_YEAR_CHOICES.map((c) => c.spoken);

describe('the holding editor asks how often a held bond pays — as the two forms ask a bond held as its own account', () => {
  test('the one wording: the question and its two choices are the ones Add an account and the Bonds editor read', () => {
    expect(COUPONS_PER_YEAR_QUESTION).toBe('Pays interest');
    expect(COUPONS_PER_YEAR_CHOICES.map((c) => [c.value, c.label])).toEqual([[1, 'Once a year'], [2, 'Twice a year']]);
  });

  test('a bond: asked after the interest rate and before the maturity date, nothing chosen, both choices offered as chips', () => {
    editor(BOND);
    expect(screen.getByText('Pays interest')).toBeOnTheScreen();
    for (const t of ['Once a year', 'Twice a year']) expect(screen.getByText(t)).toBeOnTheScreen();
    for (const l of SPOKEN) expect(screen.getByLabelText(l).props.accessibilityState).toEqual({ selected: false });
    // in order: the rate, the question, the maturity date
    const texts: string[] = [];
    const walk = (n: any) => { if (n == null || typeof n === 'string') return; if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'Text') { const t = [].concat(n.children ?? []).filter((c: any) => typeof c === 'string').join(''); if (t) texts.push(t); }
      (n.children ?? []).forEach(walk); };
    walk(screen.toJSON());
    const at = (t: string) => texts.indexOf(t);
    expect(at('Interest rate % (optional)')).toBeGreaterThanOrEqual(0);
    expect(at('Interest rate % (optional)')).toBeLessThan(at('Pays interest'));
    expect(at('Pays interest')).toBeLessThan(at('Once a year'));
    expect(at('Twice a year')).toBeLessThan(at('Matures (optional)'));
  });

  test('chosen: saved on the holding as 2 (or 1); not chosen is not entered', () => {
    let e = editor(BOND);
    fireEvent.press(screen.getByLabelText('Pays interest twice a year'));
    expect(screen.getByLabelText('Pays interest twice a year').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(e.onSave.mock.calls[0][1].coupons_per_year).toBe(2);
    e.r.unmount();
    e = editor(BOND);
    fireEvent.press(screen.getByLabelText('Pays interest once a year'));
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(e.onSave.mock.calls[0][1].coupons_per_year).toBe(1);
    e.r.unmount();
    e = editor(BOND);
    fireEvent.press(screen.getByLabelText('Save holding'));
    const saved = e.onSave.mock.calls[0][1];
    expect('coupons_per_year' in saved).toBe(true);
    expect(saved.coupons_per_year).toBeUndefined();                           // the store merges, so a key left undefined clears it
  });

  test('editing shows the saved answer', () => {
    editor({ ...BOND, coupons_per_year: 2 });
    expect(screen.getByLabelText('Pays interest twice a year').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText('Pays interest once a year').props.accessibilityState).toEqual({ selected: false });
  });

  test('a CD held in an account is asked its face value, rate and maturity, never how often it pays, and keeps none', () => {
    const { onSave } = editor({ ...CD, coupons_per_year: 2 });
    expect(screen.getByText('Interest rate % (optional)')).toBeOnTheScreen();
    expect(screen.queryByText('Pays interest')).toBeNull();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1].coupons_per_year).toBeUndefined();
  });

  test('a stock is never asked, and saves none', () => {
    const { onSave } = editor(STOCK);
    expect(screen.queryByText('Pays interest')).toBeNull();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1].coupons_per_year).toBeUndefined();
  });
});

describe('the answer is read by the line under the bond on its account page (holdingBondFacts → the yield to maturity)', () => {
  test('the drawing\'s worked example, by the app\'s own estimate: once a year $241 over 220 days; twice a year $40 over 36 of 181', () => {
    const now = new Date(`${TODAY}T12:00:00`);
    const info = (perYear?: 1 | 2) => bondInfo({ asset_id: 'x', label: 'US Treasury 2030', kind: 'bond', tax_bucket: 'TAXABLE', balance: 9_850,
      face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-03-15', ...(perYear ? { coupons_per_year: perYear } : {}) } as any);
    const once = estimatedAccrued(info(1), now)!, twice = estimatedAccrued(info(2), now)!, none = estimatedAccrued(info(), now)!;
    expect(once.days).toBe(220);                                              // Mar 15, 2026 → Oct 21, 2026
    expect(once.amount).toBeCloseTo(10_000 * 0.04 * 220 / 365, 9);            // $241.10
    expect(Math.round(once.amount)).toBe(241);
    expect(twice.days).toBe(36);                                              // Sep 15, 2026 → Oct 21, 2026, of the 181 to Mar 15, 2027
    expect(twice.amount).toBeCloseTo(10_000 * 0.04 / 2 * 36 / 181, 9);        // $39.78
    expect(Math.round(twice.amount)).toBe(40);
    expect(none).toEqual(once);                                               // not entered keeps the once-a-year assumption
  });

  test('chosen on Holding detail\'s editor, saved on the holding, and the account page\'s line shows the yield to maturity it gives', () => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [account([BOND])], priceCache: {} } as any);
    const facts = (perYear?: 1 | 2) => holdingBondFacts({ ...BOND, ...(perYear ? { coupons_per_year: perYear } : {}) } as any, 9_850, new Date(`${TODAY}T12:00:00`));
    const once = facts(1).yieldToMaturity!, twice = facts(2).yieldToMaturity!;
    expect(facts(undefined).yieldToMaturity).toBe(once);
    expect(Math.abs(twice - once)).toBeGreaterThan(0.0001);                   // the choice moves the yield
    // the line before the choice: the once-a-year assumption
    mockParams = { id: 'brk' };
    let r = render(<AccountPortfolioScreen />);
    const lineOf = () => screen.getAllByText(/ face · /).map((n) => [].concat(n.props.children ?? []).join(''));
    const before = lineOf();
    expect(before).toEqual([`$10,000 face · 4.00% · YTM ${fig('MK-NW-M-026', once)} · matures Mar 15, 2030`]);
    r.unmount();
    // the person opens the holding, taps Twice a year, saves
    mockParams = { account: 'brk', position: 'p1' };
    r = render(<HoldingDetailScreen />);
    fireEvent.press(screen.getByLabelText('Edit this holding'));
    fireEvent.press(screen.getByLabelText('Pays interest twice a year'));
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(st().assetAccounts[0].positions[0].coupons_per_year).toBe(2);
    expect(st().assetAccounts[0].positions[0].face_value).toBe(10_000);       // the other facts are kept
    r.unmount();
    mockParams = { id: 'brk' };
    render(<AccountPortfolioScreen />);
    const after = lineOf();
    expect(after).toEqual([`$10,000 face · 4.00% · YTM ${fig('MK-NW-M-026', twice)} · matures Mar 15, 2030`]);
    expect(after).not.toEqual(before);
  });
});
