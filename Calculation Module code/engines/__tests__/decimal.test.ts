// The exact-arithmetic engine — Track 0. Every later reconciliation assertion stands on this.
import { Dec } from '../decimal';

describe('WHY FLOATS HAD TO GO', () => {
  test('the classic: 0.1 + 0.2 IS 0.3 here, exactly', () => {
    expect(0.1 + 0.2 === 0.3).toBe(false);                       // the disease
    expect(Dec.of('0.1').add(Dec.of('0.2')).eq(Dec.of('0.3'))).toBe(true);   // the cure
  });

  test('a reconciliation can now assert EQUALITY, not a tolerance', () => {
    // holdings + cash = the broker's stated total — the check that could never be exact before
    const holdings = Dec.of('361250.65'); const cash = Dec.of('837.94');
    expect(holdings.add(cash).eq(Dec.of('362088.59'))).toBe(true);
  });

  test("the founder's reinvestment pairs cancel to EXACTLY zero", () => {
    const pairs = ['139.49','9.46','9.75','10.14','525.76','294.41','204.31'];
    const legs = pairs.flatMap((a) => [Dec.of(a), Dec.of(a).neg()]);
    expect(Dec.sum(legs).isZero()).toBe(true);
    expect(Dec.sum(pairs.map(Dec.of)).toString()).toBe('1193.32');
  });
});

describe('PARSING — the strings institutions actually write', () => {
  test('Fidelity/Vanguard formats, exactly', () => {
    expect(Dec.parse('$8,502.00 ')!.toString()).toBe('8502');
    expect(Dec.parse('(0.53)')!.toString()).toBe('-0.53');       // parentheses mean negative
    expect(Dec.parse('99.78125')!.toString()).toBe('99.78125');  // a bond price, five places, exact
    expect(Dec.parse('-7.73%')!.toString()).toBe('-7.73');
  });
  test('unreadable is NULL — never zero, never a partial guess (R2)', () => {
    for (const v of ['--', '', '  ', 'n/a', 'abc', '5,0oo', NaN, Infinity]) {
      expect(Dec.parse(v as any)).toBeNull();
    }
  });
  test('satoshi-level values survive — eight places', () => {
    expect(Dec.of('0.00000001').toString()).toBe('0.00000001');
    expect(Dec.of('0.00000001').add(Dec.of('0.00000002')).toString()).toBe('0.00000003');
  });
  test('precision BEYOND eight places is refused, not silently truncated', () => {
    expect(Dec.parse('0.000000001')).toBeNull();
    expect(Dec.parse('1.000000000')).not.toBeNull();             // trailing zeros are fine
  });
});

describe('ROUNDING — once, at the edge, half-even (R6)', () => {
  test('banker\'s rounding does not drift upward across .5 cases', () => {
    expect(Dec.of('2.125').round(2).toString()).toBe('2.12');    // to even
    expect(Dec.of('2.135').round(2).toString()).toBe('2.14');    // to even
    expect(Dec.of('-2.125').round(2).toString()).toBe('-2.12');
  });
  test('round twice ≠ round once — which is why only the edge rounds', () => {
    // 2.4449 → (round 3) 2.445 → (round 2) 2.44…? two-step gives 2.44; but naive half-up twice gives 2.45.
    // The rule: the ONLY rounding is the final one, directly from full precision.
    expect(Dec.of('2.4449').round(2).toString()).toBe('2.44');
  });
  test('display numbers come from the rounded value', () => {
    expect(Dec.of('1193.325').toNumber(2)).toBe(1193.32);
  });
});

describe('ARITHMETIC', () => {
  test('face × price ÷ 100 equals the broker cash — bond prices are quoted per $100 of face', () => {
    // straight from the founder's Vanguard file: Buy 227,000 face at 98.87846111 → $224,454.11.
    // My first version of this test omitted the ÷100 and the engine's exact answer exposed it —
    // the convention that would overstate a bond position a hundredfold if forgotten (E*TRADE
    // taught the same lesson live on 2026-07-19).
    expect(Dec.of('227000').mul(Dec.of('98.87846111')).divRound(Dec.of('100')).round(2).toString())
      .toBe('224454.11');
  });
  test('division names its rounding and refuses zero', () => {
    expect(Dec.of('1').divRound(Dec.of('3')).toString()).toBe('0.33333333');
    expect(() => Dec.of('1').divRound(Dec.ZERO)).toThrow();
  });
  test('serialisation round-trips through JSON as a STRING', () => {
    const d = Dec.of('361250.65');
    expect(JSON.parse(JSON.stringify({ v: d })).v).toBe('361250.65');
    expect(Dec.of(JSON.parse(JSON.stringify({ v: d })).v).eq(d)).toBe(true);
  });
});
