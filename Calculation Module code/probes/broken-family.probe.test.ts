// PROBES — the broken family. Every row of the inventory is proved HERE, by executing the real
// function, before it may be called documented.
//
// A probe is not a unit test looking for bugs. It is evidence that the sentence written in the
// spreadsheet is true of the code that ships. Three times this week I wrote something accurate-
// sounding about behaviour and was wrong; a probe is what makes "accurate-sounding" impossible.
//
// This file covers the family behind the founder's F15: how a broker's activity becomes a
// transaction, how a change is worked out, and how a return is measured. It is the family where
// the app told the founder $1.4m arrived in an account where Vanguard says nothing moved.
import { buildChangeWalk, investableChangePct, trendPoints, normalizeSnapshot, readHistory } from '../../src/domain/history';
import { mapPosition, mapActivityType, netCashSleeve, activityKey, dedupeActivities } from '../../src/services/sync/snaptrade';
import { periodReturn, portfolioPeriodReturn } from '../../src/domain/performance';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// NW_CHANGE_WALK  ·  src/domain/history.ts:144
// Answers: "what drove my net worth from one date to another?"
// Formula:  wealthGenerated = (ending − beginning) − contributions + withdrawals − debtPrincipal
//           marketChange    = wealthGenerated − dividends − interest
// DERIVATION RULE (and the defect): marketChange is a RESIDUAL. Whatever the ledger cannot explain
// lands there. It is labelled "change in investment value", which is a measurement it never makes.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('NW_CHANGE_WALK', () => {
  test('the rows always sum to the ending value — the design goal, and it holds', () => {
    const w = buildChangeWalk({ beginning: 100_000, ending: 112_000, contributions: 5_000,
      withdrawals: 1_000, dividends: 400, interest: 100, debtPrincipal: 2_000, fromLabel: 'a', toLabel: 'b' });
    expect(w.beginning + w.contributions - w.withdrawals + w.wealthGenerated + w.debtPrincipal).toBe(w.ending);
    expect(w.dividends + w.interest + w.marketChange).toBe(w.wealthGenerated);
  });

  test('THE DEFECT: with nothing moved, a contribution manufactures an equal market loss', () => {
    // the founder's own screen: beginning = ending = 939,089, contributions 500 → −500 "market loss"
    expect(buildChangeWalk({ beginning: 939_089, ending: 939_089, contributions: 500,
      fromLabel: 'Aug 1', toLabel: 'Aug 17' }).marketChange).toBe(-500);
  });

  test('a real loss and a phantom one are indistinguishable in that row', () => {
    const phantom = buildChangeWalk({ beginning: 100_000, ending: 100_000, contributions: 500, fromLabel: 'a', toLabel: 'b' });
    const real    = buildChangeWalk({ beginning: 100_000, ending:  99_500, contributions: 0,   fromLabel: 'a', toLabel: 'b' });
    expect(phantom.marketChange).toBe(real.marketChange);
  });

  test('negatives are floored on the way IN, so a bad input cannot flip a sign quietly', () => {
    const w = buildChangeWalk({ beginning: 100, ending: 200, contributions: -50, dividends: -10, fromLabel: 'a', toLabel: 'b' });
    expect(w.contributions).toBe(0);
    expect(w.dividends).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// NW_CHANGE_PCT  ·  src/domain/history.ts:118
// Answers: "what is my return on cash + investments since the baseline?"
// Formula:  (currentInvestable − baseline) ÷ baseline, to 1 decimal place
// DERIVATION RULE: baseline = the EARLIEST daily point on or after the change line's own baseline
// date. Property is excluded because it only moves when someone retypes it.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('NW_CHANGE_PCT', () => {
  test('it measures against the earliest daily point at or after the baseline date', () => {
    const daily = { '2026-07-15': 100_000, '2026-08-01': 200_000, '2026-08-10': 300_000 };
    expect(investableChangePct(daily, 220_000, '2026-08-01')).toBe(10);   // vs 200,000, not 100,000
  });

  test('no history → NO percent. It is never back-guessed', () => {
    expect(investableChangePct({}, 220_000, '2026-08-01')).toBeNull();
    expect(investableChangePct({ '2026-07-01': 100 }, 220_000, '2026-08-01')).toBeNull();
    expect(investableChangePct(null, 220_000, '2026-08-01')).toBeNull();
  });

  test('WHY THE FOUNDER SAW +2.0% ON A LOSING YEAR: the baseline is whatever day the app was opened', () => {
    // if the only stored point was written AFTER the fall, the fall is invisible and the small
    // recovery since shows as a gain. The percent is honest about its own baseline and nothing else.
    const afterTheFall = { '2026-08-01': 355_000 };
    expect(investableChangePct(afterTheFall, 362_089, '2026-08-01')).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// INGEST_POSITION_CLASS  ·  src/services/sync/snaptrade.ts:116
// Answers: "what asset class is this holding?"
// DERIVATION RULE (founder, 2026-08-04): cash means cash only. Anything paying dividends or
// interest goes to a MEASURED bucket, or the return maths silently loses its income.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const pos = (o: any) => mapPosition({ units: 100, price: 10, ...o } as any);
const sym = (raw: string, description = '', code = 'cs') => ({ symbol: { symbol: { raw_symbol: raw, symbol: raw, description, type: { code } } } });

describe('INGEST_POSITION_CLASS', () => {
  test('a money-market fund is MEASURED, not cash — F6', () => {
    expect(pos({ ...sym('VMFXX', 'VANGUARD FEDERAL MONEY MARKET FUND', 'mf'), cash_equivalent: true })!.assetClass).toBe('stocks_etf');
  });

  test('a CD lands in bonds even without the bond type code — the maturity is in the TEXT', () => {
    expect(pos(sym('06418AAA1', 'KEYBANK NA 4.00% CD 08/24/26'))!.assetClass).toBe('bonds');
  });

  test('a plain share is equities', () => {
    expect(pos(sym('VTI', 'VANGUARD TOTAL STOCK MARKET ETF'))!.assetClass).toBe('stocks_etf');
  });

  test('no symbol, or no shares, returns null rather than a zero-value holding', () => {
    expect(mapPosition({ units: 0, ...sym('VTI') } as any)).toBeNull();
    expect(mapPosition({ units: 100 } as any)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// TRANSLATE_BROKER_WORD  ·  src/services/sync/snaptrade.ts:184
// Answers: "is this broker activity money arriving, money leaving, or an internal move?"
// DERIVATION RULE — THE ONE THAT BROKE VANGUARD: only CONTRIBUTION is external money in and only
// WITHDRAWAL is external money out. A BUY or SELL is an INTERNAL move and must never be counted as
// either, because deposits feed the personal-return figure and faking them corrupts it.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('TRANSLATE_BROKER_WORD', () => {
  test('the mapping table is right — trades are trades, not cash flows', () => {
    const t = (type: string, extra: any = {}) => mapActivityType({ type, ...extra } as any).txnType;
    expect(t('BUY')).toBe('BUY');
    expect(t('SELL')).toBe('SELL');
    expect(t('CONTRIBUTION')).toBe('DEPOSIT');
    expect(t('WITHDRAWAL')).toBe('WITHDRAWAL');
    expect(t('DIVIDEND')).toBe('DIVIDEND');
    expect(t('INTEREST')).toBe('INTEREST');
  });

  test('an OPTION trade is still internal — it never becomes a deposit', () => {
    const m = mapActivityType({ type: 'BUY', option_symbol: 'AAPL250117C00220000' } as any);
    expect(m.txnType).toBe('BUY');
    expect(['DEPOSIT', 'WITHDRAWAL']).not.toContain(m.txnType);
  });

  test('nothing in the table turns a trade into external money', () => {
    for (const type of ['BUY', 'SELL', 'SPLIT', 'ADJUSTMENT', 'OPTIONEXPIRATION']) {
      expect(['DEPOSIT', 'WITHDRAWAL']).not.toContain(mapActivityType({ type } as any).txnType);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// INGEST_CASH_SLEEVE  ·  src/services/sync/snaptrade.ts:269
// Answers: "how much uninvested cash does this account really hold?"
// DERIVATION RULE: the broker's cash figure INCLUDES money-market funds that also appear as
// holdings, so the sleeve subtracts them. A genuine margin debit stays negative; only sub-dollar
// rounding dust clamps to zero.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('INGEST_CASH_SLEEVE', () => {
  test('a money-market holding is netted out so the same money is not counted twice', () => {
    const mmf = pos({ ...sym('VMFXX', 'MONEY MARKET', 'mf'), units: 50_000, price: 1, cash_equivalent: true })!;
    expect(netCashSleeve(60_000, [mmf])).toBe(10_000);
  });

  test('a real margin debit stays negative — flooring it would overstate the account', () => {
    expect(netCashSleeve(-5_000, [])).toBe(-5_000);
  });

  test('only rounding dust clamps to zero', () => {
    expect(netCashSleeve(-0.4, [])).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// INGEST_DEDUPE  ·  src/services/sync/snaptrade.ts:243
// DERIVATION RULE: the same activity re-fetched must not be ingested twice, or every sync inflates
// contributions. The key is date + type + symbol + amount.
// ════════════════════════════════════════════════════════════════════════════════════════════════
// CORRECTED BY THE PROBE. I first documented these as dedupeActivities(list) and activityKey(a).
// Both take the ACCOUNT ID first, and dedupe takes a set of already-seen keys — meaning the same
// activity in two different accounts is correctly two activities, and dedupe is stateful across
// syncs rather than within one batch. Neither fact was in my description until the probe failed.
describe('INGEST_DEDUPE', () => {
  const act = (o: any = {}) => ({ trade_date: '2026-08-01', type: 'BUY', amount: 500,
    symbol: { raw_symbol: 'VTI' }, ...o }) as any;

  test('an activity already seen in a previous sync is not ingested again', () => {
    const seen = new Set([activityKey('acct-1', act())]);
    expect(dedupeActivities('acct-1', [act()], seen).length).toBe(0);
  });

  test('the same activity in a DIFFERENT account is a different activity', () => {
    expect(activityKey('acct-1', act())).not.toBe(activityKey('acct-2', act()));
  });

  test('two genuinely different trades on one day both survive', () => {
    expect(dedupeActivities('acct-1', [act(), act({ amount: 700 })], new Set()).length).toBe(2);
  });

  test('a repeat WITHIN one batch is also caught, not just across syncs', () => {
    expect(dedupeActivities('acct-1', [act(), act()], new Set()).length).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PERF_PERIOD_RETURN  ·  src/domain/performance/index.ts:107
// Answers: "what did this holding do over the window?"
// ════════════════════════════════════════════════════════════════════════════════════════════════
// CORRECTED BY THE PROBE. I documented this as taking two dates. It takes a NAMED period ('1M',
// 'YTD', '1Y'…) and works the start date out itself, and the series is an object with .points, not
// an array. A person cannot ask it for an arbitrary window — which matters, because Vanguard's own
// statement is an arbitrary window (1 Jan → 14 Aug) and this cannot reproduce it directly.
describe('PERF_PERIOD_RETURN', () => {
  const series = { ticker: 'VTI', points: [
    { date: '2026-01-01', close: 100 },
    { date: '2026-08-14', close: 90 },
  ] } as any;
  const NOW = new Date('2026-08-14T12:00:00Z');

  test('YTD is the price change from 1 January to the latest close, as a decimal', () => {
    expect(periodReturn(series, 'YTD', NOW)).toBeCloseTo(-0.1, 3);
  });

  test('no series, or an empty one → null, never zero — "no data" is not "no change"', () => {
    expect(periodReturn(null, 'YTD', NOW)).toBeNull();
    expect(periodReturn({ ticker: 'VTI', points: [] } as any, 'YTD', NOW)).toBeNull();
  });

  test('it takes a NAMED period only — an arbitrary window is not something it can answer', () => {
    const { PERIODS } = require('../../src/domain/performance');
    expect(PERIODS).toEqual(['1M', '3M', '6M', 'YTD', '1Y', '2Y']);
  });
});
