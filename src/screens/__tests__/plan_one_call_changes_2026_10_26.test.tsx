/** THE PLAN SCREENS' ONE-CALL CHANGES, EACH HELD TO THE SCREEN THAT ALREADY USES THE RULE (2026-10-26, CLEANUP-LEFT).
 *
 *  (a) The tax rate on required withdrawals (willItLastInputs, MK-PL-F-067) and the cockpit's bracket today read totalGrossAnnual(op):
 *      the accounts' interest and dividends left out (FIX-INCOME-A's one profile, src/hooks/useIncomeProfile.ts, reaches them now),
 *      and the cockpit's bracket also left each earner's 401(k) in — it is the Income summary's bracket now (MK-CF-M-043).
 *  (b) Roth conversion and Required withdrawals grew pre-tax money at a flat, unstated 5.5% when no return was set. They read the
 *      Plan's one return (paycheckReturn, FIX-ROOM; the lead's ruling 2) and say it, in the draw sheet's words "Growth used: …".
 *  (c) The cockpit said "$8,000 age-50+ catch-up" at 60 to 63, where the limit holds $11,250 (IRC §414(v)(2)(E)); the amount is now
 *      the limit's own, and the words are Contribution room's.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLines } from '../../testing/mockMatch';
import { profileWithAccountIncome, totalGrossAnnual } from '../../domain/income/onboarding';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';
import { willItLastInputs } from '../../domain/retirement/willItLast';
import { paycheckReturn } from '../../domain/paycheck';
import { effectiveRateOnGrossFor } from '../../domain/income/tax';
import { rmdSchedule, drawAssumptionsSaid } from '../../domain/decumulation';
import { IRS_LIMITS } from '../../domain/income/limits';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00'), doNotFake: [...FAKE] }); });
afterEach(() => { setHideBalances(false); jest.useRealTimers(); });

const WORKER: any = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', whoEarns: 'you',
  baseSalary: '5500', salaryFreq: 'monthly', salaryMode: 'gross', monthlySpending: '3000' };
/** $50,000 of savings at 4%, nothing typed for interest: $2,000 calculated */
const SAVINGS: any = { asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'TAXABLE', balance: 50_000, coupon_rate: 0.04, asset_class: 'cash' };
const IRA: any = { asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415_000 };
function open(name: 'cockpit' | 'rmd' | 'roth' | 'room', op: any, accounts: any[]) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, displayMode: 'advisor', onboardingProfile: op, assetAccounts: accounts, transactions: [] } as any);
  const C = { cockpit: () => require('../RetirementCockpit').default, rmd: () => require('../RequiredWithdrawalsScreen').default,
    roth: () => require('../RothScreen').default, room: () => require('../ContributionRoomScreen').default }[name]();
  return render(<C />);
}

describe('(a) the accounts\' interest is in the tax on the Plan too — read through the one profile', () => {
  test('the required-withdrawal tax rate: $120,000 of wages + $2,000 of interest → 14.77% on $122,000 (it was 14.64% on $120,000)', () => {
    const op = { ...WORKER, baseSalary: '10000' };
    const inputs = willItLastInputs({ op, accounts: [SAVINGS], assumptions: {} } as any)!;
    // by hand: $122,000 − $16,100 = $105,900 taxed → $1,240 + $4,560 + 22% × $55,300 + 24% × $200 = $18,014; ÷ $122,000 = 14.7656%
    expect(inputs.rmd_tax_rate).toBeCloseTo(18_014 / 122_000, 9);
    expect(inputs.rmd_tax_rate).toBeCloseTo(effectiveRateOnGrossFor(122_000, 'single', 0, 0), 12);
    // the base it reads is the Income summary's gross a year (MK-CF-M-076) for the same person
    const p = profileWithAccountIncome(op, [SAVINGS], []);
    expect(totalGrossAnnual(p)).toBe(incomeSummary(p).taxed.grossAnnual);
    expect(incomeSummary(p).taxed.grossAnnual).toBe(122_000);
  });
  test.failing('the rate until 2026-10-26, pinned: the $2,000 of interest left out — $17,570 ÷ $120,000 = 14.64% (FIXED 2026-10-26)', () => {
    const inputs = willItLastInputs({ op: { ...WORKER, baseSalary: '10000' }, accounts: [SAVINGS], assumptions: {} } as any)!;
    expect(inputs.rmd_tax_rate).toBeCloseTo(17_570 / 120_000, 9);
  });

  test('the cockpit\'s bracket today is the Income summary\'s: interest in, each earner\'s 401(k) out', () => {
    const cases: [string, any, any[], number][] = [
      // $66,000 + $2,000 of interest − $16,100 = $51,900, past the 12% band's $50,400 top → 22% (it read 12%: the interest left out)
      ['wages and calculated interest', WORKER, [SAVINGS], 22],
      // $70,000 − $10,000 into a 401(k) − $16,100 = $43,900 → 12% (it read 22%: the 401(k) left in)
      ['a 401(k)', { ...WORKER, baseSalary: String(70_000 / 12), c_401k: String(10_000 / 12) }, [], 12],
      ['both', { ...WORKER, c_401k: '500' }, [SAVINGS], 12],
    ];
    for (const [, op, accounts, pct] of cases) {
      const p = profileWithAccountIncome(op, accounts, []);
      expect(Math.round(incomeSummary(p).taxed.bracket * 100)).toBe(pct);
      open('cockpit', op, accounts);
      const line = builtLines(screen.toJSON()).find((l) => /marginal ~\d+% now/.test(l)) ?? '';
      expect(line.match(/marginal ~(\d+)% now/)?.[1]).toBe(String(pct));
      screen.unmount();
    }
  });
});

describe('(b) the Plan\'s one return, stated, on Roth conversion and Required withdrawals', () => {
  const OLD = { ...WORKER, birthYear: '1966' };   // 60 this year; required withdrawals from 75
  test('Required withdrawals: the first one, ~$52,776, grown at 7.90% — the blended benchmark (it was ~$37,662 at an unstated 5.5%)', () => {
    const ret = paycheckReturn([IRA], {}, OLD);
    expect(ret.mean_return).toBeCloseTo(0.079, 12);   // the blended benchmark of the IRA
    expect(ret.basis).toBe('benchmark');
    expect(ret.said).toMatch(/^7\.90%/);
    // by hand: $415,000 × 1.079^15 = $1,298,286, ÷ the age-75 divisor 24.6 = $52,776
    expect(Math.round(rmdSchedule(415_000, 60, ret.mean_return, 12)[0].amount)).toBe(52_776);
    expect(Math.round(rmdSchedule(415_000, 60, 0.055, 12)[0].amount)).toBe(37_662);
    open('rmd', OLD, [IRA]);
    const L = builtLines(screen.toJSON());
    expect(L).toContain('Yours starts in 2041 (age 75). Estimated first withdrawal: ~$52,776 — it moves with your balance between now and then.');
    expect(L).toContain(`Growth used: ${paycheckReturn([IRA], {}, OLD).said}.`);
  });
  test('Roth conversion: $50,000 converted makes the required withdrawals at 75 about $6,359/year smaller, at the same stated 7.90%', () => {
    open('roth', OLD, [IRA]);
    fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '50000');
    const L = builtLines(screen.toJSON());
    // by hand: $50,000 × 1.079^15 ÷ 24.6 = $6,358.6 (at 5.5% it read $4,538)
    expect(L).toContain('Required withdrawals at 75: about $6,359/year smaller');
    expect(L).toContain(`Growth used until 75: ${paycheckReturn([IRA], {}, OLD).said}.`);
  });
  test('Roth conversion\'s tax stands on what the year is taxed on, the Income summary\'s: $70,000 with $10,000 into a 401(k), $20,000 converted → about $3,750 (it read $4,400)', () => {
    // by hand (2026, single): on $60,000 the tax is $1,240 + 12% × $31,500 = $5,020; on $80,000, $1,240 + $4,560 + 22% × $13,500 =
    // $8,770; the conversion costs $3,750, 18.75% — kept whole since 2026-10-26 (round 2, item 3; it was rounded to 19% → $3,800).
    // On $70,000 (the 401(k) left in): 22% → $4,400
    const op = { ...OLD, baseSalary: String(70_000 / 12), c_401k: String(10_000 / 12) };
    expect(incomeSummary(profileWithAccountIncome(op, [IRA], []) as any).taxed.taxedOn).toBeCloseTo(60_000, 6);
    open('roth', op, [IRA]);
    fireEvent.changeText(screen.getByLabelText('Amount to convert this year'), '20000');
    expect(builtLines(screen.toJSON())).toContain('Tax bill next April: about $3,750');
    expect(builtLines(screen.toJSON())).toContain('Rate used: 18.75% (calculated from your income) · change it ›');
  });
  test('the words are the draw sheet\'s: "Growth used: " and the return in paycheckReturn\'s own words', () => {
    const ret = paycheckReturn([IRA], {}, OLD);
    const sheet = drawAssumptionsSaid({ ordinaryRate: 0.22, gainsOn: { ordinaryIncome: 60_000, status: 'single', over65: 0 }, gainShare: 0, growthSaid: ret.said, inflation: 0.025 });
    expect(sheet).toContain(`Growth used: ${ret.said}, less 2.50% inflation.`);
  });
});

describe('(c) the cockpit\'s catch-up is the one inside the limit, in Contribution room\'s words', () => {
  const at = (age: number) => ({ ...WORKER, birthYear: String(2026 - age), c_401k: '500' });
  const cockpitLine = (age: number) => { open('cockpit', at(age), []); const l = builtLines(screen.toJSON()).find((x) => /to your 401\(k\) this year/.test(x)) ?? ''; screen.unmount(); return l; };
  const roomWords = (age: number) => { open('room', at(age), []); const l = builtLines(screen.toJSON()).join(' ').match(/Includes the (age 60–63|age-50\+) catch-up/)?.[1] ?? null; screen.unmount(); return l; };
  test.each([
    [51, '$8,000', 'age-50+', '$32,500'],
    [60, '$11,250', 'age 60–63', '$35,750'],
    [63, '$11,250', 'age 60–63', '$35,750'],
    [64, '$8,000', 'age-50+', '$32,500'],
  ])('at %i: incl. the %s %s catch-up — up to %s, the same words as Contribution room', (age, amount, words, limit) => {
    expect(cockpitLine(age)).toContain(`(incl. the ${amount} ${words} catch-up) — up to ${limit}.`);
    expect(roomWords(age)).toBe(words);
  });
  test('the amounts are the constants: $24,500 + $11,250 = $35,750; $24,500 + $8,000 = $32,500', () => {
    expect(IRS_LIMITS.elective_deferral_401k + IRS_LIMITS.super_catch_up_60_63).toBe(35_750);
    expect(IRS_LIMITS.elective_deferral_401k + IRS_LIMITS.catch_up_50).toBe(32_500);
  });
  test('under 50: no catch-up words at all', () => {
    expect(cockpitLine(45)).not.toMatch(/catch-up/);
  });
  test.failing('the words until 2026-10-26, pinned: "$8,000 age-50+" at 61 (FIXED 2026-10-26)', () => {
    expect(cockpitLine(61)).toContain('(incl. the $8,000 age-50+ catch-up)');
  });
});
