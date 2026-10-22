/** SHARES PER CONTRACT ARE AN OPTION'S FIGURE, AND SAVE STAYS OFF FOR A FIGURE THAT IS NOT A REAL NUMBER (2026-10-21).
 *
 *  Found by the Performance outside re-run, OpenAI part 3 (MK-PF-F-031 contractMultiplier; its cases in
 *  MoneyKeel/functions/networth-and-performance/outside_performance_rerun_openai_03.test.ts):
 *   (a) a holding saved as an option and then changed to a stock in the holding editor kept its shares per contract — the
 *       editor left the key out and the store merges, so the 100 stayed — and the function used a stated figure for any
 *       kind: 10 shares at $50 read $50,000, not $500, on the account and on Net worth. His rules: DEC-0274 (an option is
 *       contracts × 100 × price unless stated otherwise) and DEC-4646 (the hand-typed option's Shares per contract box).
 *   (b) a box keeps the digits typed, so 309 of them read as Infinity, passed the above-zero check and saved; every value it
 *       touched was infinite. Save now stays off for any figure the sheet reads that is not a real number (DEC-3523).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { contractMultiplier, marketValue } from '../../domain/performance';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useSegments: () => [],
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));

const { HoldingEditor } = require('../PerformanceScreen');
const st = () => useStore.getState() as any;
const LOTS = [{ lot_id: 'l1', shares: 10, cost_per_share: 50, purchase_date: '2026-01-02' }];
const OPTION = { position_id: 'p1', ticker: 'XYZ', kind: 'options', multiplier: 100, lots: LOTS };
const BOND = { position_id: 'p2', ticker: '91282CXX0', label: 'US Treasury 2030', kind: 'fixed_income', asset_class: 'bond',
  lots: [{ lot_id: 'l2', shares: 100, cost_per_share: 98, purchase_date: '2025-01-05' }] };
const ACCOUNT = (positions: any[]) => ({ asset_id: 'b', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 0, target_return: 0.08, derive_balance: true, positions });
const open = (position: any) => {
  const onSave = jest.fn();
  render(<HoldingEditor open accounts={[ACCOUNT([position])]} existing={{ accountId: 'b', position }} onClose={jest.fn()} onSave={onSave} />);
  return onSave;
};
const saveIsOff = () => expect(screen.getByLabelText('Save holding').props.accessibilityState?.disabled).toBe(true);
const NINES = '9'.repeat(309);   // parses to Infinity

describe('(a) an option changed to a stock: its shares per contract are cleared, and a stock never reads one', () => {
  test('the editor saves the cleared figure; the store holds none; the account is worth $500, not $50,000', () => {
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, assetAccounts: [ACCOUNT([OPTION])],
      priceCache: { XYZ: { ticker: 'XYZ', points: [{ date: '2026-10-20', close: 50 }] } } } as any);
    st().updatePosition('b', 'p1', {});                                          // the store's own write builds the balance
    expect(st().assetAccounts[0].balance).toBe(10 * 50 * 100);                   // the option: 10 contracts × 100 × $50
    const onSave = open(OPTION);
    expect(screen.getByText('Shares per contract')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Type: Stocks / Funds'));
    expect(screen.queryByText('Shares per contract')).toBeNull();
    fireEvent.press(screen.getByLabelText('Save holding'));
    const saved = onSave.mock.calls[0][1];
    expect(saved.kind).toBe('stocks_etf');
    expect('multiplier' in saved && saved.multiplier === undefined).toBe(true);   // before: the key was left out
    st().updatePosition('b', 'p1', saved);                                       // what HoldingDetailScreen's onSave does
    const p = st().assetAccounts[0].positions[0];
    expect([p.kind, p.multiplier, contractMultiplier(p), marketValue(p, 50)]).toEqual(['stocks_etf', undefined, 1, 500]);
    expect(st().assetAccounts[0].balance).toBe(500);                              // the balance Net worth adds: was $50,000
  });

  test('an option keeps the figure typed — 10 for a mini option', () => {
    const onSave = open(OPTION);
    fireEvent.changeText(screen.getByLabelText('Shares per contract'), '10');
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1].multiplier).toBe(10);
    expect(contractMultiplier(onSave.mock.calls[0][1])).toBe(10);
  });
});

describe('(b) Save stays off for a figure that is not a real number', () => {
  test('shares per contract typed as 309 digits: Save is off and nothing is saved', () => {
    const onSave = open(OPTION);
    fireEvent.changeText(screen.getByLabelText('Shares per contract'), NINES);
    saveIsOff();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Shares per contract'), '100');   // a real figure turns it back on
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1].multiplier).toBe(100);
  });

  test('the shares or the price paid typed as 309 digits: Save is off', () => {
    let onSave = open({ ...OPTION, kind: 'stocks_etf', multiplier: undefined });
    fireEvent.changeText(screen.getAllByPlaceholderText('0')[0], NINES);
    saveIsOff();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave).not.toHaveBeenCalled();
    screen.unmount();
    onSave = open({ ...OPTION, kind: 'stocks_etf', multiplier: undefined });
    fireEvent.changeText(screen.getAllByPlaceholderText('—')[0], NINES);
    saveIsOff();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('a held bond\'s face value or rate typed as 309 digits: Save is off', () => {
    let onSave = open(BOND);
    fireEvent.changeText(screen.getByLabelText('Face value'), NINES);
    saveIsOff();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave).not.toHaveBeenCalled();
    screen.unmount();
    onSave = open(BOND);
    fireEvent.changeText(screen.getByLabelText('Coupon percent'), NINES);
    saveIsOff();
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('ordinary figures still save', () => {
    const onSave = open(BOND);
    fireEvent.changeText(screen.getByLabelText('Face value'), '10000');
    fireEvent.changeText(screen.getByLabelText('Coupon percent'), '4');
    fireEvent.press(screen.getByLabelText('Save holding'));
    expect(onSave.mock.calls[0][1]).toMatchObject({ face_value: 10000, coupon_rate: 0.04 });
  });
});
