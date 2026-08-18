// PROBES — how ONE connected account splits across the classes, and how that split is described.
//
// A connected brokerage is not one thing. It holds a CD, a money-market fund, some shares and a
// little uninvested cash, and the founder's approved design splits it across the classes it really
// holds — with the slices summing EXACTLY to the broker's own total, because that total is the one
// number a person can check against their statement.
//
// Two functions do this: one works out the AMOUNTS, the other writes the WORDS under each slice.
// They are probed together because they must agree, and they use different rules.
import { accountClassBreakdown, classPortionLabel, valueFreshness, accountDisplayNames } from '../../src/domain/assets';

const A = (o: any) => ({ asset_id: 'a', label: 'Vanguard', tax_bucket: 'TAXABLE', source: 'connected', balance: 0, ...o } as any);
const P = (ticker: string, name: string, shares: number, price: number, asset_class?: string) =>
  ({ position_id: ticker, ticker, name, last_price: price, asset_class, lots: [{ lot_id: 'l', shares, cost_per_share: 1 }] });

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ACCOUNT_SPLIT
// DERIVATION RULE: the slices must add to the broker's stated total, because that total is what the
// person sees on their own statement. Anything left over is placed by a rule, never dropped.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ACCOUNT_SPLIT', () => {
  test('only a CONNECTED account splits — typed and imported ones stay whole', () => {
    expect(accountClassBreakdown(A({ source: 'manual', balance: 1000 }))).toBeNull();
    expect(accountClassBreakdown(A({ source: 'imported', balance: 1000 }))).toBeNull();
    expect(accountClassBreakdown(A({ balance: 1000 }))).not.toBeNull();
  });

  test('the NAME decides the class, over whatever the broker tagged it', () => {
    // the broker tags both VMFXX and a CD as 'cash'; the words say otherwise
    const b = accountClassBreakdown(A({
      balance: 30_000, cash_balance: 0,
      positions: [
        P('VMFXX', 'VANGUARD FEDERAL MONEY MARKET FUND', 100, 100, 'cash'),
        P('06418AAA1', 'KEYBANK NA 4.00% CD 08/24/26', 100, 100, 'cash'),
        P('VTI', 'VANGUARD TOTAL STOCK MARKET ETF', 100, 100),
      ],
    }))!;
    expect(b.stocks_etf).toBe(20_000);      // the money-market fund AND the ETF
    expect(b.bonds).toBe(10_000);           // the CD
    expect(b.cash).toBe(0);                 // nothing is cash here, and the broker said two things were
  });

  test('the slices add up to the broker\'s own total — the number on the statement', () => {
    const a = A({ balance: 25_000, cash_balance: 5_000, positions: [P('VTI', 'VANGUARD TOTAL STOCK', 100, 200)] });
    const b = accountClassBreakdown(a)!;
    expect(Object.values(b).reduce((t, v) => t + v, 0)).toBe(25_000);
  });

  test('a small POSITIVE leftover becomes cash — not "more of whatever is biggest"', () => {
    // founder finding 2026-08-11, "why is cash added to CD and not cash?": the leftover used to go
    // to the largest class, so on a CD-heavy account uninvested money was counted as MORE CDs.
    const b = accountClassBreakdown(A({
      balance: 10_100, cash_balance: 0,
      positions: [P('06418AAA1', 'KEYBANK NA 4.00% CD 08/24/26', 100, 100)],
    }))!;
    expect(b.bonds).toBe(10_000);
    expect(b.cash).toBe(100);               // the leftover is uninvested money, not more CDs
  });

  test('option holdings land in alternatives and are never double-counted', () => {
    const b = accountClassBreakdown(A({
      balance: 12_000, cash_balance: 0,
      positions: [P('VTI', 'VANGUARD TOTAL STOCK', 100, 100)],
      option_holdings: [{ label: 'AAPL $220 call', contracts: 1, value: 2_000 }],
    }))!;
    expect(b.alternatives).toBe(2_000);
    expect(Object.values(b).reduce((t, v) => t + v, 0)).toBe(12_000);
  });

  test('an unpriced holding contributes zero, and the gap shows up as leftover rather than vanishing', () => {
    const b = accountClassBreakdown(A({
      balance: 10_000, cash_balance: 0,
      positions: [{ position_id: 'x', ticker: 'ZZZ', name: 'unpriced', lots: [{ lot_id: 'l', shares: 10, cost_per_share: 1 }] }],
    }))!;
    expect(Object.values(b).reduce((t, v) => t + v, 0)).toBe(10_000);   // the money is still all there
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SLICE_WORDING — and whether it agrees with the amounts above
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('SLICE_WORDING', () => {
  test('a cash slice says plainly what it is', () => {
    expect(classPortionLabel(A({}), 'cash')).toBe('cash in this account');
  });

  test('DEFECT: the wording uses a DIFFERENT rule from the amounts, so the two can disagree', () => {
    // The amounts classify by NAME (a money-market fund is Stocks / Funds). The wording classifies
    // ONLY by the broker's tag. Give it a fund the broker tagged 'cash' and the value sits under
    // Stocks / Funds while the words describing that slice never mention it.
    const a = A({
      balance: 10_000, cash_balance: 0,
      positions: [P('VMFXX', 'VANGUARD FEDERAL MONEY MARKET FUND', 100, 100, 'cash')],
    });
    expect(accountClassBreakdown(a)!.stocks_etf).toBe(10_000);   // the money is under Stocks / Funds…
    const words = classPortionLabel(a, 'stocks_etf');
    expect(words).not.toMatch(/money market/i);                  // …and the words there do not know it
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// VALUE_FRESHNESS · ACCOUNT_NAMES
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('VALUE_FRESHNESS / ACCOUNT_NAMES', () => {
  const now = new Date('2026-08-17T12:00:00Z');

  test('a hand-entered value carries its age, and six months is the line', () => {
    expect(valueFreshness(A({ value_as_of: '2026-08-01' }), now)!.stale).toBe(false);
    expect(valueFreshness(A({ value_as_of: '2026-02-01' }), now)!.stale).toBe(true);
    expect(valueFreshness(A({ value_as_of: '2026-02-01' }), now)!.monthsOld).toBe(6);
  });

  test('a live-priced account has no staleness at all — the question does not apply', () => {
    expect(valueFreshness(A({ derive_balance: true, value_as_of: '2020-01-01' }), now)).toBeNull();
    expect(valueFreshness(A({}), now)).toBeNull();
  });

  test('two accounts with the same name are numbered, stably', () => {
    const names = accountDisplayNames([
      { asset_id: 'b', label: 'Brokerage', institution: 'Vanguard' },
      { asset_id: 'a', label: 'Brokerage', institution: 'Vanguard' },
      { asset_id: 'c', label: 'Roth', institution: 'Vanguard' },
    ] as any);
    expect(names.get('a')).toMatch(/· 1$/);      // ordered by id, so the numbering never shuffles
    expect(names.get('b')).toMatch(/· 2$/);
    expect(names.get('c')).not.toMatch(/·\s*\d$/);
  });
});
