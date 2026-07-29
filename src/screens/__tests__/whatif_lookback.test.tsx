// The two Invest what-ifs. Pins: Look back shows the design's honest states (real prices or a plain
// 'we can't answer' — never an invented number); the forward what-if runs the SAME shared inputs as
// the hub (before-chance = hub chance) and the +$/mo dial moves both estimates; the 401(k)-room
// try-it prefill lands with its number.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LookBackScreen from '../LookBackScreen';
import WhatIfScreen from '../WhatIfScreen';
import { useStore } from '../../store/useStore';
import { selectWillItLast } from '../../domain/retirement/willItLast';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'],
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000',
  targetRetirementAge: '67', horizonAge: '92', c_401k: '500',
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const seriesFor = (start: number, end: number) => {
  const now = new Date();
  const back = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
  return { points: [
    { date: back(14), close: start }, { date: back(6), close: (start + end) / 2 }, { date: iso(now), close: end },
  ] };
};

beforeEach(() => {
  useStore.getState().resetAll();
  mockParams = {};
});

describe('Look back', () => {
  test('real prices → the three honest lines and the signed difference', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50000,
        positions: [{ position_id: 'p1', ticker: 'BND', kind: 'fixed_income', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 100, purchase_date: '2024-01-01' }] }] }],
      priceCache: { BND: { ticker: 'BND', ...seriesFor(100, 97) }, SPY: { ticker: 'SPY', ...seriesFor(100, 110.1) } },
    } as any);
    render(<LookBackScreen />);
    expect(screen.getByText('Facts about the PAST only')).toBeOnTheScreen();
    expect(screen.getByText(/Left in BND it became/)).toBeOnTheScreen();
    expect(screen.getByText(/\$19,400/)).toBeOnTheScreen();
    expect(screen.getByText(/\$22,020/)).toBeOnTheScreen();
    expect(screen.getByText(/Difference: \$2,620 more if you had moved/)).toBeOnTheScreen();
    expect(screen.getByText(/not a prediction of what happens next/)).toBeOnTheScreen();
  });

  test('prices not reaching back → the honest absence, never an invented number', () => {
    useStore.setState({ priceCache: {} } as any);
    render(<LookBackScreen />);
    expect(screen.getByText(/We never invent a price/)).toBeOnTheScreen();
    expect(screen.queryByText(/Difference:/)).toBeNull();
  });
});

describe('What if I add more?', () => {
  const seed = () => useStore.setState({
    onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 400000 }],
  } as any);

  test('the before-chance IS the hub number (same shared inputs), and the dial moves both estimates', () => {
    seed();
    render(<WhatIfScreen />);
    const s = useStore.getState() as any;
    const hub = selectWillItLast({ op: s.onboardingProfile, accounts: s.assetAccounts, assumptions: s.retirementAssumptions, inflationRate: s.inflationRate, employmentStatus: s.employmentStatus });
    expect(screen.getByText(new RegExp(`${hub.chance}% →`))).toBeOnTheScreen();   // before = the hub, to the digit
    expect(screen.getByText(/AT 67 \(ESTIMATES\)/)).toBeOnTheScreen();
    expect(screen.getByText(/we just show the math/)).toBeOnTheScreen();
  });

  test('the ?addMonthly= prefill lands (the 401(k)-room try-it path)', () => {
    seed();
    mockParams = { addMonthly: '1500' };
    render(<WhatIfScreen />);
    expect(screen.getByText('+$1,500/mo')).toBeOnTheScreen();
  });

  test('no plan basics yet → the no-guessed-numbers state', () => {
    render(<WhatIfScreen />);
    expect(screen.getByText(/No guessed numbers/)).toBeOnTheScreen();
  });
});

// B46 founder finding ("slider still not moving"): the screen's ScrollView must stand down while
// a finger is on a slider — its native pan recognizer was cancelling the drag on device.
test('the ScrollView disables scrolling during a slider drag and re-enables on release', () => {
  const { ScrollView } = require('react-native');
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1980', monthlySpending: '4000' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 200000 }],
  } as any);
  const utils = render(<WhatIfScreen />);
  const scroll = () => utils.UNSAFE_getAllByType(ScrollView)[0].props.scrollEnabled;
  expect(scroll()).toBe(true);
  const { act } = require('@testing-library/react-native');
  const strip = utils.getAllByTestId('plan-slider-strip')[0];
  fireEvent(strip, 'layout', { nativeEvent: { layout: { width: 300, height: 44, x: 0, y: 0 } } });
  act(() => { strip.props.onResponderGrant({ nativeEvent: { locationX: 150, pageX: 250 }, touchHistory: { touchBank: [], mostRecentTimeStamp: 1 } }); });
  expect(scroll()).toBe(false);                        // finger down → no scrolling
  act(() => { strip.props.onResponderRelease({ nativeEvent: {}, touchHistory: { touchBank: [], mostRecentTimeStamp: 2 } }); });
  expect(scroll()).toBe(true);                         // finger up → scrolling back
});
