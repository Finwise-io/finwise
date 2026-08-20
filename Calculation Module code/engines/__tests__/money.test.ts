// The money engine, proved against the real strings in the founder's own institution files.
// Track 0: amounts are exact decimals (Dec). Totals are asserted as exact strings — no
// float tolerance anywhere, because there is no float anywhere.
import { readMoney, signed, sumSigned, toNumber } from '../money';
import { Dec } from '../decimal';

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
    const out = readMoney(-139.49, 'NEGATIVE_IS_OUT');
    expect(out.amount.toString()).toBe('139.49');
    expect(out.direction).toBe('OUT');
    const inn = readMoney(139.49, 'NEGATIVE_IS_OUT');
    expect(inn.amount.toString()).toBe('139.49');
    expect(inn.direction).toBe('IN');
  });

  test('FDX runs the OTHER way — a debit is money leaving, exposed POSITIVE', () => {
    expect(readMoney(500, 'POSITIVE_IS_OUT').direction).toBe('OUT');
    expect(readMoney(-500, 'POSITIVE_IS_OUT').direction).toBe('IN');
  });

  test('THE SIGN KEEPS ITS MEANING — a stated direction never overrides a contradicting sign', () => {
    // Audit item 36. A −$500 row whose event says IN is a REVERSAL of that income —
    // money actually left. The old engine let the label win and booked +$500 of income
    // that never arrived. The stated direction applies only when the source has no sign.
    expect(readMoney(-500, 'NEGATIVE_IS_OUT', 'IN').direction).toBe('OUT');
    expect(readMoney(500, 'NEGATIVE_IS_OUT', 'IN').direction).toBe('IN');
    // A source that publishes all-positive amounts carries no sign — there, the label rules.
    expect(readMoney(500, 'ALWAYS_POSITIVE', 'OUT').direction).toBe('OUT');
  });

  test('zero carries no direction at all', () => {
    expect(readMoney(0, 'NEGATIVE_IS_OUT').direction).toBe('NONE');
  });
});

describe("THE FOUNDER'S $2,387 — cannot happen through this engine", () => {
  // his seven monthly money-market payouts, each a credit and its reinvestment debit
  const PAIRS = ['139.49', '9.46', '9.75', '10.14', '525.76', '294.41', '204.31'];

  test('the pair nets to EXACTLY zero cash, as it does in reality', () => {
    const legs = PAIRS.flatMap((a) => [readMoney(a, 'NEGATIVE_IS_OUT'), readMoney('-' + a, 'NEGATIVE_IS_OUT')]);
    expect(sumSigned(legs).isZero()).toBe(true);   // true zero, not 1e-13
  });

  test('and the OLD way — absolute values — produces exactly the number he saw', () => {
    const oldWay = Dec.sum(PAIRS.flatMap((a) => [Dec.of(a).abs(), Dec.of('-' + a).abs()]));
    expect(oldWay.round(2).toString()).toBe('2386.64');            // the $2,387 on his screen
    expect(Dec.sum(PAIRS.map(Dec.of)).toString()).toBe('1193.32'); // the truth
  });

  test('income counted once is the statement figure, to the cent', () => {
    const incomeOnly = PAIRS.map((a) => readMoney(a, 'NEGATIVE_IS_OUT', 'IN'));
    expect(sumSigned(incomeOnly).toString()).toBe('1193.32');
  });
});

describe('SIGNED ADDITION — the operation that was missing', () => {
  test('a charge reduces a total instead of inflating it', () => {
    expect(sumSigned([readMoney(1193, 'NEGATIVE_IS_OUT'), readMoney(-400, 'NEGATIVE_IS_OUT')]).toString()).toBe('793');
  });
  test('a deposit and its reversal cancel to true zero', () => {
    expect(sumSigned([readMoney(5000, 'NEGATIVE_IS_OUT'), readMoney(-5000, 'NEGATIVE_IS_OUT')]).isZero()).toBe(true);
  });
  test('signed() carries the direction into the value', () => {
    expect(signed(readMoney(-42.5, 'NEGATIVE_IS_OUT')).toString()).toBe('-42.5');
    expect(signed(readMoney(42.5, 'NEGATIVE_IS_OUT')).toString()).toBe('42.5');
  });
});
