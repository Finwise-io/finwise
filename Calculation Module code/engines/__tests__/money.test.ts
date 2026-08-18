// The money engine, proved against the real strings in the founder's own institution files.
import { readMoney, signed, sumSigned, toNumber } from '../money';

describe('TEXT MONEY — the exact strings institutions write', () => {
  test("Fidelity's formatting, verbatim from the founder's file", () => {
    expect(toNumber('"$8,502.00 "'.replace(/"/g, ''))).toBe(8502);
    expect(toNumber('$928.46 ')).toBe(928.46);
    expect(toNumber('$1.00 ')).toBe(1);
    expect(toNumber('-7.73%')).toBe(-7.73);
  });

  test('PARENTHESES MEAN NEGATIVE — read as positive, every loss flips sign', () => {
    expect(toNumber('($0.53)')).toBe(-0.53);
    expect(toNumber('($1.81)')).toBe(-1.81);
    expect(toNumber('(1,234.56)')).toBe(-1234.56);
  });

  test('the empty shapes are NOTHING, never zero', () => {
    // Fidelity writes "--" for a bond with no cost basis. Zero would say "it cost nothing".
    for (const v of ['--', '', '   ', null, undefined, 'n/a']) expect(toNumber(v)).toBeNull();
  });
});

describe('DIRECTION — held in its own field, never inferred from the sign', () => {
  test('the ordinary convention: negative means money left', () => {
    expect(readMoney(-139.49, 'NEGATIVE_IS_OUT')).toEqual({ amount: 139.49, direction: 'OUT' });
    expect(readMoney(139.49, 'NEGATIVE_IS_OUT')).toEqual({ amount: 139.49, direction: 'IN' });
  });

  test('FDX runs the OTHER way — a debit is money leaving, exposed POSITIVE', () => {
    expect(readMoney(500, 'POSITIVE_IS_OUT').direction).toBe('OUT');
    expect(readMoney(-500, 'POSITIVE_IS_OUT').direction).toBe('IN');
  });

  test('a stated direction always beats an inferred one', () => {
    expect(readMoney(-500, 'NEGATIVE_IS_OUT', 'IN').direction).toBe('IN');
  });

  test('zero carries no direction at all', () => {
    expect(readMoney(0, 'NEGATIVE_IS_OUT').direction).toBe('NONE');
  });
});

describe("THE FOUNDER'S $2,387 — cannot happen through this engine", () => {
  // his seven monthly money-market payouts, each a credit and its reinvestment debit
  const PAIRS = [139.49, 9.46, 9.75, 10.14, 525.76, 294.41, 204.31];

  test('the pair nets to ZERO cash, as it does in reality', () => {
    const legs = PAIRS.flatMap((a) => [readMoney(a, 'NEGATIVE_IS_OUT'), readMoney(-a, 'NEGATIVE_IS_OUT')]);
    expect(sumSigned(legs)).toBe(0);
  });

  test('and the OLD way — absolute values — produces exactly the number he saw', () => {
    const oldWay = PAIRS.flatMap((a) => [Math.abs(a), Math.abs(-a)]).reduce((x, y) => x + y, 0);
    expect(Math.round(oldWay * 100) / 100).toBe(2386.64);        // the $2,387 on his screen
    expect(Math.round(PAIRS.reduce((x, y) => x + y, 0) * 100) / 100).toBe(1193.32);   // the truth
  });

  test('income counted once is the statement figure, to the cent', () => {
    const incomeOnly = PAIRS.map((a) => readMoney(a, 'NEGATIVE_IS_OUT', 'IN'));
    expect(sumSigned(incomeOnly)).toBe(1193.32);
  });
});

describe('SIGNED ADDITION — the operation that was missing', () => {
  test('a charge reduces a total instead of inflating it', () => {
    expect(sumSigned([readMoney(1193, 'NEGATIVE_IS_OUT'), readMoney(-400, 'NEGATIVE_IS_OUT')])).toBe(793);
  });
  test('a deposit and its reversal cancel', () => {
    expect(sumSigned([readMoney(5000, 'NEGATIVE_IS_OUT'), readMoney(-5000, 'NEGATIVE_IS_OUT')])).toBe(0);
  });
});
