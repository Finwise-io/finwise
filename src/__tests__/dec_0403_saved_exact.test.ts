/** DEC-0403 — "held as a float, decimals shown only for prices" (master Q49, 2026-09-09): nothing rounds inside a
 *  calculation or when it is stored; rounding happens once, on screen.
 *
 *  Until 2026-10-20 four places that SAVE values cut them to cents first. Each test below feeds a value with more
 *  than two decimals and checks the saved value is the exact one. Every one of these failed on the old code: it
 *  saved 100.00 for a $99.9999 account, $33.33 for a third of $100, and so on.
 *  The source-reading half of this rule is src/__tests__/precision_guard.test.ts. */
import { useStore } from '../store/useStore';
import { ingestSync, stAssetId } from '../services/sync/ingest';
import { mapOptionHolding, netCashSleeve } from '../services/sync/snaptrade';

describe('DEC-0403 — a saved value is the exact one, never one cut to cents', () => {
  test('DEC-0403 — the store keeps an account built from its holdings at the exact sum (3 shares at $33.3333 = $99.9999, not $100.00)', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.07, derive_balance: true, positions: [] }],
      priceCache: { ABC: { ticker: 'ABC', points: [{ date: '2026-10-19', close: 33.3333 }] } },
      transactions: [],
    } as any);
    useStore.getState().addPosition('b1', { ticker: 'ABC', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 3, cost_per_share: 30, purchase_date: '2026-01-02' }] } as any);
    const a = useStore.getState().assetAccounts.find((x) => x.asset_id === 'b1')!;
    expect(a.balance).toBeCloseTo(99.9999, 10);   // the old code stored round2(99.9999) = 100
    expect(a.balance).not.toBe(100);
  });

  test('DEC-0403 — funding a goal keeps the exact amount (a third of $100 stays a third, not $33.33)', () => {
    useStore.setState({ goals: [], allocatedByMonth: {} } as any);
    useStore.getState().addGoal({ label: 'Trip', icon: '✈️', target: 1000, saved: 0, color: '#000' } as any);
    const id = useStore.getState().goals[0].id;
    useStore.getState().fundGoals('2026-10', [{ goalId: id, amount: 100 / 3 }]);
    const g: any = useStore.getState().goals[0];
    expect(g.saved).toBe(100 / 3);                       // was Math.round(33.333… × 100) / 100 = 33.33
    expect(g.fundedByMonth['2026-10']).toBe(100 / 3);
  });

  test('DEC-0403 — a linked account with no broker total keeps its derived value exact', () => {
    const r = ingestSync([], {}, [{
      account: { id: 'acc-x', brokerage_authorization: 'c', name: 'Brokerage', number: '1234', institution_name: 'Vanguard', raw_type: 'Individual', balance: { total: null } } as any,
      balancesCash: 0,
      positions: [{ symbol: { id: 'u', raw_symbol: 'ABC', type: { code: 'cs' } } as any, units: 3, price: 33.3333, average_purchase_price: 30 }],
    }], '2026-10-20T12:00:00.000Z');
    const a = r.accounts.find((x) => x.asset_id === stAssetId('acc-x'))!;
    expect(a.balance).toBeCloseTo(99.9999, 10);          // the old code stored 100
    expect(a.balance).not.toBe(100);
  });

  test('DEC-0403 — an option row and the cash beside the holdings are stored exact', () => {
    const o = mapOptionHolding({ symbol: { option_symbol: { ticker: 'X', option_type: 'CALL', strike_price: 10, expiration_date: '2027-01-15', underlying_symbol: { symbol: 'X' } } } as any, units: 1, price: 0.12345, average_purchase_price: 12.3456 } as any)!;
    expect(o.value).toBeCloseTo(12.345, 10);             // 0.12345 × 1 contract × 100 shares; the old code stored 12.35
    expect(o.costBasis).toBeCloseTo(12.3456, 10);        // the old code stored 12.35
    expect(netCashSleeve(100.005, [])).toBeCloseTo(100.005, 10);   // the old code stored 100.01
  });
});
