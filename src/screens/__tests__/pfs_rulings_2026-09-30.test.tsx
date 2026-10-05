/** HIS ANSWERS IN THE LAUNCH ANSWER LIST (2026-09-30), folded in on 2026-10-05 — the ones a screen shows.
 *
 *  Q11: "Refuse the line and ask" — a holding nothing can class is in no class and the person is asked.
 *  Q12: "user entry stays even if it is not in the import file. If user modify cost or quantity post
 *        import/linked from institution, cost basis should not be overwritten in future sync …"
 *  Q14: "Call an account by it's name - no need to label it unless it is checking or savings account."
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { accountClassBreakdown } from '../../domain/assets';
import { theNetWorth } from '../../../MoneyKeel/functions/networth-and-performance/net-worth';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const lot = (shares: number, cost: number) => ({ lot_id: `l${shares}`, shares, cost_per_share: cost, purchase_date: '2024-01-02' });
const LINKED = { asset_id: 'rh', label: 'Robinhood', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 25_050, cash_balance: 0,
  positions: [{ position_id: 'p1', ticker: 'VTI', name: 'Vanguard Total', asset_class: 'stock_etf', last_price: 250, lots: [lot(100, 200)] },
              { position_id: 'p2', ticker: 'ZZZZ', name: 'ZZZZ', asset_class: 'stock_etf', last_price: 5, lots: [lot(10, 4)], class_asked: true }] };
beforeEach(() => { useStore.getState().resetAll(); useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self' } as any); });

describe('Q11 — a holding nothing can class', () => {
  test('is counted in no class: its $50 is Unclassified, not Stocks / Funds', () => {
    const b = accountClassBreakdown(LINKED as any)!;
    expect([b.stocks_etf, b.mixed]).toEqual([25_000, 50]);
    // once the person says what it is, it is counted there
    const said = { ...LINKED, positions: LINKED.positions.map((p) => p.ticker === 'ZZZZ' ? { ...p, asset_class: 'bond', class_source: 'user', class_asked: undefined } : p) };
    expect(accountClassBreakdown(said as any)!.bonds).toBe(50);
  });

  test('the function names it and Net worth asks about it', () => {
    const n = theNetWorth({ uid: 'u', accounts: [LINKED] as any, debts: [] });
    expect(n.unclassed).toEqual([{ accountId: 'rh', account: 'Robinhood', positionId: 'p2', holding: 'ZZZZ' }]);
    useStore.setState({ assetAccounts: [LINKED] } as any);
    render(<NetWorth />);
    expect(screen.getByText('The app cannot tell what ZZZZ in Robinhood is, so it is in no class yet. Open it and say what it is.')).toBeOnTheScreen();
  });

  test('saying what it is ends the asking', () => {
    useStore.setState({ assetAccounts: [LINKED] } as any);
    (useStore.getState() as any).updatePosition('rh', 'p2', { asset_class: 'bond' });
    const p: any = (useStore.getState() as any).assetAccounts[0].positions.find((x: any) => x.position_id === 'p2');
    expect([p.class_source, p.class_asked]).toEqual(['user', undefined]);
    expect(theNetWorth({ uid: 'u', accounts: (useStore.getState() as any).assetAccounts, debts: [] }).unclassedSentence).toBe('');
  });
});

describe('Q12 — what the person entered on a linked account is marked as theirs', () => {
  test('a cost they set is stamped, so the next sync keeps it; a holding they add is stamped, so the next sync keeps it', () => {
    useStore.setState({ assetAccounts: [LINKED] } as any);
    const s = useStore.getState() as any;
    s.updatePosition('rh', 'p1', { lots: [lot(100, 180)] });
    s.addPosition('rh', { ticker: 'PRIVCO', lots: [lot(10, 50)] });
    const positions: any[] = (useStore.getState() as any).assetAccounts[0].positions;
    expect(positions.find((p) => p.ticker === 'VTI').cost_source).toBe('user');
    expect(positions.find((p) => p.ticker === 'PRIVCO')).toMatchObject({ added_by: 'user', cost_source: 'user' });
  });

  test('on an account entered by hand nothing is stamped — there is no sync to protect it from', () => {
    useStore.setState({ assetAccounts: [{ ...LINKED, source: 'manual' }] } as any);
    (useStore.getState() as any).updatePosition('rh', 'p1', { lots: [lot(100, 180)] });
    expect((useStore.getState() as any).assetAccounts[0].positions[0].cost_source).toBeUndefined();
  });
});

describe('Q14 — an account that holds several classes is called by its name', () => {
  test('its row is its name and where its number comes from — no class word, and nothing saying "Mixed" or "Unclassified"', () => {
    useStore.setState({ assetAccounts: [
      { asset_id: 'm1', label: 'Fidelity 401(k)', institution: 'Fidelity', kind: 'retirement', tax_bucket: 'PRE_TAX', asset_class: 'mixed', balance: 80_000, target_return: 0.06 },
      { asset_id: 's1', label: 'Schwab Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf', balance: 40_000, target_return: 0.07 }] } as any);
    render(<NetWorth />);
    fireEvent.press(screen.getByText('By institution'));
    expect(screen.getByText('Fidelity 401(k)')).toBeOnTheScreen();
    expect(screen.getByText('Schwab Brokerage')).toBeOnTheScreen();
    expect(screen.queryByText(/Unclassified|Mixed/)).toBeNull();
  });
});
