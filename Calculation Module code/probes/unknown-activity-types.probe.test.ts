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
