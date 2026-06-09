import { searchTickers } from './tickers';

describe('ticker autocomplete search', () => {
  test('prefix matches on symbol rank first', () => {
    const r = searchTickers('VO');
    expect(r[0].sym).toBe('VOO');
    expect(r.length).toBeGreaterThan(0);
  });
  test('matches by company name too', () => {
    expect(searchTickers('apple').some((t) => t.sym === 'AAPL')).toBe(true);
  });
  test('empty query → no suggestions; caps results', () => {
    expect(searchTickers('')).toHaveLength(0);
    expect(searchTickers('V', 3).length).toBeLessThanOrEqual(3);
  });
  test('each hint carries a kind for the benchmark', () => {
    expect(searchTickers('BND')[0].kind).toBe('bonds');
    expect(searchTickers('BTC')[0].kind).toBe('crypto');
  });
});
