/** Q06 (founder, 2026-08-26): options: value = contracts × 100 × price unless the broker or the person
 *  states otherwise. Q09 (founder, 2026-08-26): always capture the unit beside a quantity. */
import { contractMultiplier, marketValue, costBasis, unrealizedGain, quantityUnit, quantityWithUnit, OPTION_CONTRACT_MULTIPLIER, type Position } from './index';

const pos = (over: Partial<Position>): Position => ({
  position_id: 'p1' as any, ticker: 'X', lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 3, date: '2026-01-01' } as any], ...over,
});

describe('Q06 — an option contract is 100 shares unless stated otherwise', () => {
  test('the multiplier by kind', () => {
    expect(OPTION_CONTRACT_MULTIPLIER).toBe(100);
    expect(contractMultiplier({ kind: 'options' })).toBe(100);
    expect(contractMultiplier({ kind: 'stocks_etf' })).toBe(1);
    expect(contractMultiplier({ kind: undefined })).toBe(1);
  });
  test('the broker or the person states otherwise → their multiplier wins', () => {
    expect(contractMultiplier({ kind: 'options', multiplier: 10 })).toBe(10);
    expect(contractMultiplier({ kind: 'options', multiplier: 0 })).toBe(100);   // zero is "not stated"
  });
  test('2 contracts at $3.50 = 2 × 100 × 3.50 = $700; cost basis and gain scale the same way', () => {
    const p = pos({ kind: 'options' });
    expect(marketValue(p, 3.5)).toBe(700);
    expect(costBasis(p)).toBe(600);
    expect(unrealizedGain(p, 3.5)).toBe(100);
  });
  test('a share is still a share', () => {
    const p = pos({ kind: 'stocks_etf' });
    expect(marketValue(p, 3.5)).toBe(7);
    expect(costBasis(p)).toBe(6);
  });
});

describe('Q09 — a quantity is never shown without its unit', () => {
  test('the unit the kind implies', () => {
    expect(quantityUnit({ kind: 'crypto' })).toBe('coins');
    expect(quantityUnit({ kind: 'options' })).toBe('contracts');
    expect(quantityUnit({ kind: 'commodities' })).toBe('ounces');
    expect(quantityUnit({ kind: 'stocks_etf' })).toBe('shares');
    expect(quantityUnit({})).toBe('shares');
  });
  test('the unit the person entered wins', () => {
    expect(quantityUnit({ kind: 'crypto', unit: 'units' })).toBe('units');
  });
  test('printed with the unit, singular when it is one', () => {
    expect(quantityWithUnit({ kind: 'stocks_etf' }, 3)).toBe('3 shares');
    expect(quantityWithUnit({ kind: 'stocks_etf' }, 1)).toBe('1 share');
    expect(quantityWithUnit({ kind: 'options' }, 2)).toBe('2 contracts');
    expect(quantityWithUnit({ kind: 'crypto' }, 0.5, (n) => n.toFixed(8))).toBe('0.50000000 coins');
    expect(quantityWithUnit({ kind: 'crypto' }, 1)).toBe('1 coin');
  });
});
