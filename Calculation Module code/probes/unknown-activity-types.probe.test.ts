// PROBE — what happens to an activity word the app does not recognise.
//
// The founder asked two questions about the change walk: how does the app know a contribution from
// a withdrawal, and what happens to a dividend that is automatically reinvested (which arrives as
// its own separate line). Answering them properly leads straight to the fallback rule at the bottom
// of the mapping table — and that rule is the one the code itself warns against, ten lines above.
import { mapActivityType } from '../../src/services/sync/snaptrade';

const t = (type: string, amount = 0, extra: any = {}) => mapActivityType({ type, amount, ...extra } as any);

describe('RECOGNISED WORDS — the app reads the broker\'s own word', () => {
  test('only two words mean money crossing the boundary', () => {
    expect(t('CONTRIBUTION', 5_000).txnType).toBe('DEPOSIT');
    expect(t('WITHDRAWAL', 5_000).txnType).toBe('WITHDRAWAL');
  });

  test('a reinvested dividend is INCOME, and is flagged as reinvested — not a deposit', () => {
    expect(t('REI', 120)).toEqual({ txnType: 'DIVIDEND', reinvested: true });
    expect(t('STOCK_DIVIDEND', 120).txnType).toBe('DIVIDEND');
  });

  test('a matured bond paying out is INTERNAL — proceeds, not new money', () => {
    // live-verified at E*TRADE: a maturing T-bill arrives as REDEMPTION with positive cash.
    // Reading it by sign would book six figures of fake deposits on that one account.
    expect(t('REDEMPTION', 100_000).txnType).toBe('SELL');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE FALLBACK — and why it is the likeliest cause of the founder's $1.4m
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('UNRECOGNISED WORDS — read by the SIGN of the amount', () => {
  test('DEFECT: ANY unknown word with money coming IN becomes a DEPOSIT', () => {
    expect(t('SOMETHING WE HAVE NEVER SEEN', 5_000).txnType).toBe('DEPOSIT');
    expect(t('SOMETHING WE HAVE NEVER SEEN', -5_000).txnType).toBe('WITHDRAWAL');
  });

  test('THE REINVESTMENT GAP: the app knows "REI" and nothing else', () => {
    // These are the words brokers actually use for the same event. Only the first is recognised.
    expect(t('REI', 120).txnType).toBe('DIVIDEND');                          // ✓ known
    expect(t('REINVESTMENT', 120).txnType).toBe('DEPOSIT');                  // ✗ becomes new money
    expect(t('DIVIDEND REINVESTMENT', 120).txnType).toBe('DEPOSIT');         // ✗
    expect(t('REINVEST DIVIDEND', 120).txnType).toBe('DEPOSIT');             // ✗
    expect(t('DIVIDEND REINVEST', 120).txnType).toBe('DEPOSIT');             // ✗
    expect(t('CAPITAL GAIN REINVESTMENT', 400).txnType).toBe('DEPOSIT');     // ✗
  });

  test('other everyday words that would book as new money arriving', () => {
    for (const word of [
      'DIVIDEND RECEIVED', 'QUALIFIED DIVIDEND', 'LONG TERM CAP GAIN', 'SHORT TERM CAP GAIN',
      'CAPITAL GAINS DISTRIBUTION', 'INTEREST INCOME', 'BOND INTEREST', 'COUPON PAYMENT',
      'MATURITY', 'CALLED BOND', 'SWEEP IN', 'CASH SWEEP', 'MONEY MARKET PURCHASE',
    ]) {
      expect(t(word, 500).txnType).toBe('DEPOSIT');
    }
  });

  test('WHY IT COMPOUNDS: every one of these is counted AGAIN as a deposit', () => {
    // A dividend that is reinvested produces income AND, under an unrecognised word, a deposit.
    // Twenty years of quarterly reinvested dividends on a large account is a very large number,
    // and none of it ever appeared on a statement as money paid in.
    const quarterlyReinvestments = Array.from({ length: 80 }, () => t('DIVIDEND REINVESTMENT', 4_500));
    const bookedAsNewMoney = quarterlyReinvestments.filter((x) => x.txnType === 'DEPOSIT');
    expect(bookedAsNewMoney).toHaveLength(80);
    expect(bookedAsNewMoney.length * 4_500).toBe(360_000);      // from ONE holding, on ONE account
  });

  test('the app does at least LEAVE A NOTE saying the word was unknown', () => {
    expect(t('DIVIDEND REINVESTMENT', 120).note).toBe('broker: DIVIDEND REINVESTMENT');
    // so the evidence is recoverable from the ledger: every wrongly-booked row carries the broker's
    // original word. That is how this can be confirmed on the founder's real data.
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// FOUNDER CHALLENGE 2026-08-17: "why no cash effect? Option could expire in the money."
// ════════════════════════════════════════════════════════════════════════════════════════════════
// He is half right, and the half matters. The EXPIRY event itself never moves cash — an
// out-of-the-money option just dies, and an IN-the-money one is auto-exercised, which arrives as a
// different line. For a normal share-settled option the exercise cash comes on a PAIRED BUY/SELL
// row, which we keep (live-verified on E*TRADE, 2026-07-18) — skipping the marker avoids counting
// it twice. BUT two real cases carry cash ON THE ROW WE SKIP:
//   · CASH-SETTLED index options (the SPX family) — no shares exist; exercise pays cash directly
//   · CASH-IN-LIEU on a split or merger — the fractional share paid out as money, on an ADJUSTMENT
describe('OPTION EXPIRY / EXERCISE — where the founder\'s challenge lands', () => {
  test('expiry itself: no cash, and skipping it is right', () => {
    expect(t('OPTIONEXPIRATION', 0).txnType).toBe('SKIP');
  });

  test('share-settled exercise: the marker is skipped BECAUSE the cash arrives on a paired trade row', () => {
    expect(t('OPTIONEXERCISE', 0).txnType).toBe('SKIP');
    expect(t('BUY', -22_000).txnType).toBe('BUY');       // the paired row that carries the money
  });

  test('DEFECT — a CASH-SETTLED exercise carries its cash on the skipped row, and the money vanishes', () => {
    // An SPX-style option exercised in the money pays cash directly — there is no share trade.
    // We skip the row, amount and all. The account balance rises; the ledger says nothing did.
    const r = t('OPTIONEXERCISE', 12_500);
    expect(r.txnType).toBe('SKIP');                       // ← $12,500 of real proceeds, dropped
  });

  test('DEFECT — cash-in-lieu on a split rides an ADJUSTMENT row, which no total ever reads', () => {
    // A 3-for-2 split leaves half a share; the broker pays it out as cash on an adjustment line.
    // ADJUST rows are kept as notes but excluded from every sum in the change walk.
    const r = t('ADJUSTMENT', 47.5);
    expect(r.txnType).toBe('ADJUST');                     // stored — but counted nowhere
  });

  test('what the gap costs: realized profit on a cash-settled option never gets recorded', () => {
    // the position vanishes from the holdings feed, the SKIP swallows the payout, and no SELL row
    // exists — so realized P/L, the activity list, and the walk all show nothing where money moved.
    expect(t('OPTIONASSIGNMENT', 8_000).txnType).toBe('SKIP');
  });
});
