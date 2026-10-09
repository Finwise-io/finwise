/** MK-NW-F-084 categoryEarnings — outside-review finding of 2026-10-09 (OpenAI part 3), held here so
 *  it cannot come back: a category's return weighs each holding by what it was worth when the window
 *  BEGAN (DEC-1669, DEC-3035b): Σ now ÷ Σ start − 1, start = now ÷ (1 + return). */
import { categoryEarnings } from './performance';

const row = (ticker: string, marketValue: number, periodReturn: number | null) =>
  ({ position: { ticker, asset_class: 'stock_etf' }, marketValue, periodReturn });
const stocksRet = (rows: any[]) =>
  categoryEarnings({ transactions: [{ date: '2026-02-01', type: 'DIVIDEND', amount: 1, ticker: rows[0]?.position.ticker }], windowStart: '2026-01-01', rows })
    .find((c) => c.key === 'stocks_etf')!.ret;

describe('MK-NW-F-084 categoryEarnings — weighed by the value at the start', () => {
  test('$12,000 at +20% and $10,000 at 0% → $20,000 became $22,000 = +10% (was +10.91%)', () => {
    expect(stocksRet([row('S1', 12000, 0.2), row('S2', 10000, 0)])).toBeCloseTo(0.1, 12);
  });
  test('one holding: the class return is its own return', () => {
    expect(stocksRet([row('S1', 40600, 0.12)])).toBeCloseTo(0.12, 12);
  });
  test('a holding with no return is left out, never read as 0', () => {
    expect(stocksRet([row('S1', 11000, 0.1), row('S2', 50000, null)])).toBeCloseTo(0.1, 12);
  });
  test('a return of −100% or worse has no start to divide by and is left out', () => {
    expect(stocksRet([row('S1', 11000, 0.1), row('S2', 5000, -1)])).toBeCloseTo(0.1, 12);
  });
  test('no usable holding → no return', () => {
    expect(stocksRet([row('S1', 5000, null)])).toBeNull();
  });
});
