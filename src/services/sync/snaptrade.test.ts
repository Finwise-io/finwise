// SnapTrade mapper pins (design v2 §4) — every money-accuracy rule tested: wrapper mapping asks
// when unsure, the activity table matches the approved design, dedupe survives id churn, option
// cash effects are never dropped, and the money-market sleeve never double-counts.
import {
  mapAccountType, mapPosition, mapOptionHolding, mapActivityType, activityKey, dedupeActivities,
  netCashSleeve, type StActivity, type StPosition,
} from './snaptrade';

describe('mapAccountType — the wrapper is confirmed, never silently guessed', () => {
  test('common raw types map confidently', () => {
    expect(mapAccountType('Roth IRA')).toEqual({ kind: 'roth_ira', tax_bucket: 'ROTH', confident: true });
    expect(mapAccountType('ROTH 401(K)')).toEqual({ kind: '401k', tax_bucket: 'ROTH', confident: true });
    expect(mapAccountType('Traditional IRA')).toEqual({ kind: 'trad_ira', tax_bucket: 'PRE_TAX', confident: true });
    expect(mapAccountType('Rollover IRA')).toEqual({ kind: 'trad_ira', tax_bucket: 'PRE_TAX', confident: true });
    expect(mapAccountType('401k')).toEqual({ kind: '401k', tax_bucket: 'PRE_TAX', confident: true });
    expect(mapAccountType('Individual')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE', confident: true });
    expect(mapAccountType('Margin')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE', confident: true });
    expect(mapAccountType('Checking')).toEqual({ kind: 'checking', tax_bucket: 'CASH', confident: true });
  });
  test('unknown raw type → confident:false so the UI must ask (P0: wrong wrapper = wrong tax math)', () => {
    expect(mapAccountType('Special Custody Acct 7').confident).toBe(false);
    expect(mapAccountType(null).confident).toBe(false);
  });
});

describe('mapPosition — instrument classing + lots', () => {
  const pos = (over: Partial<StPosition> = {}): StPosition => ({
    symbol: { id: 'uuid-1', raw_symbol: 'VTI', description: 'Vanguard Total Stock', type: { code: 'et' } } as any,
    units: 10, price: 250, average_purchase_price: 200, ...over,
  });
  test('ETF maps to equities with a synthetic lot when the broker sends none', () => {
    const m = mapPosition(pos())!;
    expect(m.assetClass).toBe('stocks_etf');
    expect(m.lots).toEqual([{ purchase_date: null, shares: 10, cost_per_share: 200 }]);
  });
  test("type.code 'bnd' → bonds; 'crypto' → alternatives; cash_equivalent → cash", () => {
    expect(mapPosition(pos({ symbol: { id: 's', raw_symbol: 'T', type: { code: 'bnd' } } as any }))!.assetClass).toBe('bonds');
    expect(mapPosition(pos({ symbol: { id: 's', raw_symbol: 'BTC', type: { code: 'crypto' } } as any }))!.assetClass).toBe('alternatives');
    expect(mapPosition(pos({ cash_equivalent: true }))!.assetClass).toBe('cash');
  });
  test('real broker tax lots pass through as our lots', () => {
    const m = mapPosition(pos({ tax_lots: [{ original_purchase_date: '2023-04-01', quantity: 6, purchased_price: 180 }, { original_purchase_date: '2024-09-09', quantity: 4, purchased_price: 230 }] }))!;
    expect(m.lots).toHaveLength(2);
    expect(m.lots[0]).toEqual({ purchase_date: '2023-04-01', shares: 6, cost_per_share: 180 });
  });
});

test('LIVE-VERIFIED 2026-07-19: an unflagged money-market fund (VMFXX) classes as CASH, not stocks', () => {
  const m = mapPosition({
    symbol: { symbol: { raw_symbol: 'VMFXX', description: 'Vanguard Federal Money Market', type: { code: 'oef' } } },
    units: 50000, price: 1,
  } as any)!;
  expect(m.assetClass).toBe('cash');
  expect(m.cashEquivalent).toBe(false);   // E*TRADE's flag stays false → the cash SLEEVE math is untouched
});

describe('mapOptionHolding — G2 closure: options are itemized rows, plain-English labels', () => {
  test('a call renders name, strike, expiry and its multiplied value', () => {
    const m = mapOptionHolding({
      symbol: { option_symbol: { ticker: 'AAPL250116C00220000', option_type: 'CALL', strike_price: 220, expiration_date: '2027-01-16', underlying_symbol: { raw_symbol: 'AAPL' } } },
      units: 2, price: 6.5, average_purchase_price: 410,
    })!;
    expect(m.label).toBe('AAPL $220 call · exp Jan 16 2027');
    expect(m.value).toBe(1300);            // 6.5/share × 2 contracts × 100
    expect(m.costBasis).toBe(820);         // 410/contract × 2 — LIVE-VERIFIED: avg price is already per-contract dollars
  });

  test('LIVE-VERIFIED 2026-07-19: E*TRADE put position — per-contract basis is NOT ×100 again', () => {
    const m = mapOptionHolding({
      symbol: { option_symbol: { option_type: 'PUT', strike_price: 550, expiration_date: '2027-03-19', underlying_symbol: { raw_symbol: 'QQQ' } } },
      units: 1, price: 12.4, average_purchase_price: 4180.25,
    })!;
    expect(m.value).toBe(1240);            // price is per SHARE → ×100 for the contract
    expect(m.costBasis).toBe(4180.25);     // already whole-contract dollars — never ×100 again
  });
  test('a short put is labeled as short', () => {
    const m = mapOptionHolding({ symbol: { option_symbol: { option_type: 'PUT', strike_price: 90, expiration_date: '2026-12-18', underlying_symbol: { raw_symbol: 'F' } } }, units: -1, price: 2 })!;
    expect(m.label).toContain('put');
    expect(m.label).toContain('(short)');
  });
});

describe('mapActivityType — the approved v2 table', () => {
  const act = (type: string, over: Partial<StActivity> = {}): StActivity => ({ type, ...over });
  test.each([
    ['BUY', 'BUY'], ['SELL', 'SELL'], ['DIVIDEND', 'DIVIDEND'], ['CONTRIBUTION', 'DEPOSIT'],
    ['WITHDRAWAL', 'WITHDRAWAL'], ['INTEREST', 'INTEREST'], ['FEE', 'FEE'], ['TRANSFER', 'TRANSFER'],
  ] as const)('%s → %s', (st, ours) => {
    expect(mapActivityType(act(st)).txnType).toBe(ours);
  });
  test('REI and STOCK_DIVIDEND are reinvested dividends', () => {
    expect(mapActivityType(act('REI'))).toMatchObject({ txnType: 'DIVIDEND', reinvested: true });
    expect(mapActivityType(act('STOCK_DIVIDEND'))).toMatchObject({ txnType: 'DIVIDEND', reinvested: true });
  });
  test('TAX lands as a FEE with the word, never dropped', () => {
    expect(mapActivityType(act('TAX'))).toMatchObject({ txnType: 'FEE', note: 'tax withheld' });
  });
  test('SPLIT/ADJUSTMENT touch positions, never cash', () => {
    expect(mapActivityType(act('SPLIT')).txnType).toBe('ADJUST');
    expect(mapActivityType(act('ADJUSTMENT')).txnType).toBe('ADJUST');
  });
  test('option trades are BUY/SELL (internal moves), never external flows — faking a deposit/withdrawal would corrupt the money-weighted return (audit fix)', () => {
    expect(mapActivityType(act('BUY', { option_type: 'BUY_TO_OPEN' }))).toMatchObject({ txnType: 'BUY', note: 'option purchase' });
    expect(mapActivityType(act('SELL', { option_type: 'SELL_TO_CLOSE' }))).toMatchObject({ txnType: 'SELL', note: 'option sale' });
  });
  test('unknown broker types key off the signed amount (their own guidance)', () => {
    expect(mapActivityType(act('MYSTERY_CREDIT', { amount: 12 })).txnType).toBe('DEPOSIT');
    expect(mapActivityType(act('MYSTERY_DEBIT', { amount: -12 })).txnType).toBe('WITHDRAWAL');
    expect(mapActivityType(act('MYSTERY_NOTE')).txnType).toBe('SKIP');
  });

  // LIVE-VERIFIED types (real E*TRADE connection, 2026-07-19) that the docs never listed. The
  // money-weighted return treats DEPOSIT/WITHDRAWAL as YOUR money moving — so anything internal
  // (proceeds, fees, margin interest) must never fall through to the by-sign default.
  describe('live-verified E*TRADE types (2026-07-19)', () => {
    test('REDEMPTION (matured bond/T-bill) is a SELL — six figures of these as fake deposits would destroy the personal return', () => {
      expect(mapActivityType(act('REDEMPTION', { amount: 50000, units: -50000 }))).toMatchObject({ txnType: 'SELL' });
    });
    test('WIRE IN / WIRE OUT are true external flows', () => {
      expect(mapActivityType(act('WIRE IN', { amount: 25000 })).txnType).toBe('DEPOSIT');
      expect(mapActivityType(act('WIRE OUT', { amount: -5000 })).txnType).toBe('WITHDRAWAL');
    });
    test('EXCHANGE RECEIVED IN / DELIVERED OUT are in-kind moves — units, never cash', () => {
      expect(mapActivityType(act('EXCHANGE RECEIVED IN', { units: 5, amount: 0 })).txnType).toBe('TRANSFER_IN_KIND');
      expect(mapActivityType(act('EXCHANGE DELIVERED OUT', { units: -20, amount: 0 })).txnType).toBe('TRANSFER_IN_KIND');
    });
    test('MISC is margin interest (−) or a brokerage credit (+) — internal either way', () => {
      expect(mapActivityType(act('MISC', { amount: -2.6 })).txnType).toBe('FEE');
      expect(mapActivityType(act('MISC', { amount: 0.5 })).txnType).toBe('INTEREST');
    });
    test('any *FEE* variant is a FEE — including E*TRADE\'s positive SERVICE FEE reversal', () => {
      expect(mapActivityType(act('SERVICE FEE', { amount: -12 })).txnType).toBe('FEE');
      expect(mapActivityType(act('SERVICE FEE', { amount: 12 })).txnType).toBe('FEE');
      expect(mapActivityType(act('MANDATORY REORG FEE', { amount: -15 })).txnType).toBe('FEE');
    });
  });
});

describe('dedupe — id churn cannot double money', () => {
  const a = (over: Partial<StActivity> = {}): StActivity => ({ id: 'x1', type: 'DIVIDEND', trade_date: '2026-07-01', amount: 55.2, symbol: { id: 'sym-1' } as any, ...over });
  test('same composite with a DIFFERENT id is still one row', () => {
    const seen = new Set<string>();
    expect(dedupeActivities('acct', [a()], seen)).toHaveLength(1);
    expect(dedupeActivities('acct', [a({ id: 'x2-reprocessed' })], seen)).toHaveLength(0);
  });
  test('genuinely different rows both land (two dividends same day, different amounts)', () => {
    const seen = new Set<string>();
    expect(dedupeActivities('acct', [a(), a({ amount: 17.8 })], seen)).toHaveLength(2);
  });
  test('keys are account-scoped — the same dividend in two accounts is two rows', () => {
    expect(activityKey('acct-1', a())).not.toBe(activityKey('acct-2', a()));
  });
});

describe('netCashSleeve — money-market never counted twice', () => {
  test('cash minus cash-equivalent positions, floored at zero', () => {
    const mmf = mapPosition({ symbol: { id: 'm', raw_symbol: 'SPAXX', type: { code: 'oef' } } as any, units: 100, price: 1, cash_equivalent: true })!;
    const vti = mapPosition({ symbol: { id: 'v', raw_symbol: 'VTI', type: { code: 'et' } } as any, units: 10, price: 250 })!;
    expect(netCashSleeve(500, [mmf, vti])).toBe(400);   // 500 cash − 100 SPAXX (VTI untouched)
    expect(netCashSleeve(80, [mmf, vti])).toBe(-20);    // a REAL margin debit stays negative (audit fix)
    expect(netCashSleeve(99.5, [mmf, vti])).toBe(0);    // sub-dollar rounding dust clamps to zero
  });
});
