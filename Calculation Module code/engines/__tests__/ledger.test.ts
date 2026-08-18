// The ledger bridge — one institution row in, one ledger row out.
import { toLedgerRow, totalOf, unclassified, rowsFor } from '../ledger';

const V = (word: string, amount: number, extra: any = {}) =>
  toLedgerRow({ word, amount, ...extra }, 'NEGATIVE_IS_OUT');

describe("THE FOUNDER'S VANGUARD ROWS, one at a time", () => {
  test('a sweep is visible but touches nothing', () => {
    const r = V('Sweep out', 224454.11);
    expect(r.event).toBe('SWEEP');
    expect(r.type).toBe('ADJUSTMENT');        // the app's own "touches NOTHING" type
    expect(rowsFor([r], 'contributions')).toEqual([]);
    expect(rowsFor([r], 'withdrawals')).toEqual([]);
  });

  test('a matured bond is your own money back, not a deposit', () => {
    const r = V('Corp Action (Redemption)', 219363.66);
    expect(r.event).toBe('RETURN_OF_CAPITAL');
    expect(r.type).toBe('SELL');
    expect(rowsFor([r], 'contributions')).toEqual([]);
  });

  test('the reinvestment pair: income once, purchase separately', () => {
    const income = V('Dividend', 139.49);
    const purchase = V('Reinvestment', -139.49);
    expect(income.event).toBe('DIVIDEND');
    expect(purchase.event).toBe('REINVEST_PURCHASE');
    expect(purchase.reinvested).toBe(true);
    expect(totalOf([income, purchase], 'income')).toBe(139.49);   // ONCE, not twice
  });

  test('a fee reduces rather than adds', () => {
    const r = V('Fee', -100);
    expect(r.event).toBe('FEE');
    expect(r.signedAmount).toBe(-100);
    expect(r.direction).toBe('OUT');
  });
});

describe('THE UNCLASSIFIED RULE — an unknown word can never reach a total', () => {
  const r = V('PROMOTIONAL CREDIT', 5000);

  test('it is written down, with the money and the original word intact', () => {
    expect(r.amount).toBe(5000);
    expect(r.sourceWord).toBe('PROMOTIONAL CREDIT');
    expect(r.recognised).toBe(false);
  });

  test('it counts in NOTHING — this is the fix for the phantom contributions', () => {
    for (const t of ['contributions', 'withdrawals', 'income', 'costs'] as const) {
      expect(totalOf([r], t)).toBe(0);
    }
  });

  test('and it says so, in words a person can act on', () => {
    expect(r.note).toContain('could not classify');
    expect(unclassified([r, V('Dividend', 10)])).toHaveLength(1);
  });
});

describe("THE FOUNDER'S OPTION CHALLENGE — money on a row we would otherwise skip", () => {
  test('an expiry with no money is a marker', () => {
    const r = V('OPTIONEXPIRATION', 0);
    expect(r.event).toBe('OPTION_EXPIRY');
    expect(r.amount).toBe(0);
  });

  test('a CASH-SETTLED exercise KEEPS its money instead of dropping it', () => {
    // "option could expire in the money" — the old code returned SKIP and the proceeds vanished
    const r = V('OPTIONEXERCISE', 12500);
    expect(r.event).toBe('OPTION_EXERCISE');
    expect(r.amount).toBe(12500);              // ← no longer dropped
    expect(r.type).toBe('ADJUSTMENT');         // visible, and counted in no external total
  });
});

describe('TRADE PRICING — the broker\'s own cash figure is the truth', () => {
  test('price is normalised so shares × price equals the cash exactly', () => {
    // a bond priced per $100 of face: raw price would overstate the gain a hundredfold
    const r = V('Buy', -224454.11, { units: 227000 });
    expect(r.shares).toBe(227000);
    expect(Math.round(r.shares! * r.price! * 100) / 100).toBeCloseTo(224454.11, 0);
  });

  test('shares are stored positive; the event carries the direction', () => {
    expect(V('SELL', 5000, { units: -100 }).shares).toBe(100);
  });
});
