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
    expect(totalOf([income, purchase], 'income').toString()).toBe('139.49');   // ONCE, not twice — exact
  });

  test('a fee reduces rather than adds', () => {
    const r = V('Fee', -100);
    expect(r.event).toBe('FEE');
    expect(r.signedAmount.toString()).toBe('-100');
    expect(r.direction).toBe('OUT');
  });
});

describe('THE UNCLASSIFIED RULE — an unknown word can never reach a total', () => {
  const r = V('PROMOTIONAL CREDIT', 5000);

  test('it is written down, with the money and the original word intact', () => {
    expect(r.amount.toString()).toBe('5000');
    expect(r.sourceWord).toBe('PROMOTIONAL CREDIT');
    expect(r.recognised).toBe(false);
  });

  test('it counts in NOTHING — this is the fix for the phantom contributions', () => {
    for (const t of ['contributions', 'withdrawals', 'income', 'costs'] as const) {
      expect(totalOf([r], t).isZero()).toBe(true);
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
    expect(r.amount.isZero()).toBe(true);
  });

  test('a CASH-SETTLED exercise KEEPS its money instead of dropping it', () => {
    // "option could expire in the money" — the old code returned SKIP and the proceeds vanished
    const r = V('OPTIONEXERCISE', 12500);
    expect(r.event).toBe('OPTION_EXERCISE');
    expect(r.amount.toString()).toBe('12500');              // ← no longer dropped
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

// ── Track 1 step 3: the stored ledger sums through ONE table, signs respected ──
describe('personalFlowTotals — the walk totals no screen may re-derive', () => {
  const { personalFlowTotals } = require('../ledger');

  test('a deposit and its recorded reversal cancel to TRUE zero, never add', () => {
    const t = personalFlowTotals([
      { type: 'DEPOSIT', amount: 5000 },
      { type: 'DEPOSIT', amount: -5000 },   // the reversal the abs-sum used to double
    ]);
    expect(t.contributions.isZero()).toBe(true);
  });

  test('each bucket takes only its own types; internal moves and captures take nothing', () => {
    const t = personalFlowTotals([
      { type: 'DEPOSIT', amount: 1000 }, { type: 'WITHDRAWAL', amount: 400 },
      { type: 'DIVIDEND', amount: '139.49' }, { type: 'INTEREST', amount: '2636.34' },
      { type: 'COUPON', amount: '1625' }, { type: 'FEE', amount: 100 },
      { type: 'DEBT_PAYMENT', amount: 250 },
      { type: 'BUY', amount: 224454.11 }, { type: 'SELL', amount: 219363.66 },
      { type: 'TRANSFER', amount: 9999 }, { type: 'OPENING_CASH', amount: 88888 },
      { type: 'ADJUSTMENT', amount: 7 },
    ]);
    expect(t.contributions.toString()).toBe('1000');
    expect(t.withdrawals.toString()).toBe('400');
    expect(t.dividends.toString()).toBe('139.49');
    expect(t.interest.toString()).toBe('4261.34');   // interest + coupon, one bucket
    expect(t.fees.toString()).toBe('100');
    expect(t.debtPrincipal.toString()).toBe('250');
  });

  test('a type not in the table counts in NOTHING — the UNKNOWN rule, applied to the store', () => {
    const t = personalFlowTotals([{ type: 'SOMETHING_NEW', amount: 123456 }, { type: null, amount: 5 }]);
    for (const k of ['contributions', 'withdrawals', 'dividends', 'interest', 'fees', 'debtPrincipal'] as const) {
      expect(t[k].isZero()).toBe(true);
    }
  });
});
