/** ONE PERSON, ONE RATE — SIGN-UP AND CASH FLOW (2026-10-24, CF-FIX; found by CF-BRIEF).
 *
 *  Sign-up calculated its own tax rate (incomeTaxRate in src/onboarding/modules.tsx): the IRS schedule on the whole taxable
 *  income, the 401(k) still inside it. Cash flow uses the rate in force (MK-CF-F-181 rateInForce), which takes a traditional
 *  401(k) off BEFORE tax. The same person read two rates (tenet 4). The household, worked by hand:
 *    a single filer, $5,000 a month of wages ($60,000 a year), $400 a month into a 401(k) ($4,800), no rate typed.
 *    Taxed: $60,000 − $4,800 − $16,100 standard deduction = $39,100 → $1,240 + 12% × $26,700 = $4,444, 7.41% of $60,000.
 *    Take-home: $60,000 − $4,444 − $4,800 = $50,756 a year, $4,229.67 a month.
 *    Sign-up read 8.37%: the schedule on $60,000 − $16,100 = $43,900 → $1,240 + 12% × $31,500 = $5,020; take-home $50,180.
 *  Sign-up now reads the rate through MK-CF-O-004 incomeSummary (the rate in force), its months-to-clear through MK-CF-F-029
 *  monthsToClear and its growth through balanceGrownTo (MK-CF-F-126 futureValue for the contributions). Each check below
 *  renders the real screens and reads the words a person sees.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { money } from '../domain/_shared/num';
import { renderStep, incomeTaxRate, debtPayoff, fv } from './modules';
import { rateInForce } from '../domain/income/tax-rate';
import { effectiveRateOnGrossFor } from '../domain/income/tax';
import { takeHomeMonthly } from '../domain/savings';
import { monthsToClear } from '../domain/debt';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
const readLines = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};

const PAT = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: '1975', baseSalary: '5000', salaryMode: 'gross',
  salaryFreq: 'monthly', c_401k: '400', filingStatus: 'single', taxMode: 'system', monthlySpending: '3000' };

const signUp = (step: string): string[] => {
  useStore.getState().resetAll();
  const ctx: any = { status: 'employed', tracks: [], answers: PAT, setAnswer: jest.fn() };
  const r = render(<>{renderStep(step as any, ctx)}</>);
  const lines = readLines(); r.unmount(); return lines;
};
const cashFlow = (): string[] => {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, onboardingProfile: PAT } as any);
  const C = require('../screens/IncomeSummaryScreen').default;
  const r = render(<C />);
  const lines = readLines(); r.unmount(); return lines;
};

describe('the rate: sign-up and Cash flow give one person one rate', () => {
  test('the function both read: 7.41% — $4,444 of tax on $60,000 — where sign-up calculated 8.37% ($5,020)', () => {
    expect(incomeTaxRate(PAT)).toBe(rateInForce(PAT as any).rate);
    expect(incomeTaxRate(PAT) * 60_000).toBeCloseTo(4_444, 6);
    // the formula sign-up carried until 2026-10-24, kept as a witness of what it gave
    expect(effectiveRateOnGrossFor(60_000, 'single', 0, 0) * 60_000).toBeCloseTo(5_020, 6);
    expect(takeHomeMonthly(PAT as any) * 12).toBeCloseTo(50_756, 6);
  });
  test('sign-up\'s taxes step offers the calculated rate Cash flow uses: ~7%, not ~8%', () => {
    const L = signUp('income_tax');
    // two decimals since 2026-10-26 (MK-CF-M-081, the rate in force; Q49; income-end-to-end_v07 row of that date): $4,444 ÷ $60,000 = 7.4067%
    expect(L).toContain('Use the calculated rate (~7.41%)');
    expect(L.some((l) => /^~7\.41% federal income tax · 12% bracket/.test(l))).toBe(true);
  });
  test('sign-up\'s income recap: tax $4,444 at ~7%, take-home $50,756 a year — the same as its own monthly average, ≈ $4,230', () => {
    const L = signUp('recap_income');
    expect(L[L.indexOf('Take-home / year') + 1]).toBe(money(50_756));
    expect(L).toContain(`≈ ${money(4_229.67)}/month average`);
    expect(L[L.indexOf('Tax (~7.41% of your gross)') + 1]).toBe(money(-(4_444)));
    expect(L[L.indexOf('Available /year') + 1]).toBe(money(50_756));
  });
  test('Cash flow\'s income summary, same person: take-home $4,230 a month and calculated tax ≈$4,444 a year — sign-up\'s two figures', () => {
    const L = cashFlow();
    // the band is drawn in capitals; a take-home the app works out with its calculated rate wears ≈ there too, as sign-up's own
    // "≈ $4,230/month average" does (IN-03, 2026-10-25; drawing v07 rule 9)
    expect(L[L.indexOf('TAKE-HOME EACH MONTH') + 1]).toBe(`≈${money(4_229.67)}`);
    expect(L[L.indexOf('Calculated federal tax') + 2]).toBe(`≈${money(4_444)}/year`);
    const S = signUp('recap_income');
    expect(S[S.indexOf('Tax (~7.41% of your gross)') + 1]).toBe(money(-(4_444)));
    expect(S).toContain(`≈ ${money(4_229.67)}/month average`);
  });
});

describe('months to clear a debt and growth: one formula each', () => {
  test('debtPayoff reads monthsToClear: $10,000 at 18% paying $300 → the same months; paying $100 never clears', () => {
    const a = { debtBalance: '10000', debtRate: '18', debtPayment: '300' };
    expect(debtPayoff(a).months).toBe(monthsToClear(10_000, 0.18, 300));
    expect(debtPayoff(a).months).toBe(47);
    expect(debtPayoff({ ...a, debtPayment: '100' })).toMatchObject({ months: 0, interestOnly: true });
    expect(debtPayoff({ ...a, debtRate: '0' }).months).toBe(34);
  });
  test('fv reads the one growth formula: $300,000 and $1,500 a month at 4.6% for 15 years', () => {
    const r = 0.046, m = 180, i = r / 12;
    const byHand = 300_000 * (1 + i) ** m + 1_500 * (((1 + i) ** m - 1) / i);
    expect(fv(300_000, 1_500, 15, r)).toBeCloseTo(byHand, 6);
  });
  test('sign-up carries no copy of the three formulas', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'modules.tsx'), 'utf8');
    expect(src).not.toMatch(/effectiveRateOnGrossFor\(taxableAnnual/);
    expect(src).not.toMatch(/Math\.log\(pay \/ \(pay - bal \* mRate\)\)/);
    expect(src).not.toMatch(/monthly \* \(\(Math\.pow\(1 \+ r, m\) - 1\) \/ r\)/);
  });
});

/** THE INCOME AND THE BRACKET ON SIGN-UP'S TAXES STEP (2026-10-24, CF-FIX). Sign-up said "On ~$X gross" over the total of every
 *  source, the untaxed ones too, and read the bracket on it; Cash flow's income summary reads both on what the year is taxed
 *  on (MK-CF-O-004: "What it is taxed on", "Federal tax bracket · …, every source counted"). A household where the two bases
 *  differ, worked by hand: Pat's $60,000 of wages and $4,800 401(k), plus $700 a month of benefits ($8,400 a year, not taxed).
 *    Taxed on: $60,000 → $60,000 − $16,100 = $43,900 taxable → the 12% bracket (it ends at $50,400). Rate 7.41%, as above.
 *    Sign-up read: $68,400 gross → $52,300 → the 22% bracket, and ~8%. */
describe('sign-up\'s Taxes step reads the income and the bracket Cash flow reads', () => {
  const WITH_BENEFITS = { ...PAT, incomeSources: ['employment', 'benefits'], benefitMonthly: '700' };
  const signUpWith = (answers: any, step: string): string[] => {
    useStore.getState().resetAll();
    const r = render(<>{renderStep(step as any, { status: 'employed', tracks: [], answers, setAnswer: jest.fn() } as any)}</>);
    const lines = readLines(); r.unmount(); return lines;
  };
  const cashFlowWith = (answers: any): string[] => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, onboardingProfile: answers } as any);
    const C = require('../screens/IncomeSummaryScreen').default;
    const r = render(<C />); const lines = readLines(); r.unmount(); return lines;
  };
  test('the two bases differ for this household: $68,400 of every source, $60,000 taxed on', () => {
    const { totalGrossAnnual, taxableAnnual } = require('../domain/income');
    expect([totalGrossAnnual(WITH_BENEFITS), taxableAnnual(WITH_BENEFITS)]).toEqual([68_400, 60_000]);
  });
  test('Cash flow: "What it is taxed on $55,200" and the 12% bracket — sign-up: "On the ~$55,200 it is taxed on", ~7% · 12% bracket', () => {
    const C = cashFlowWith(WITH_BENEFITS);
    expect(C[C.indexOf('WHAT IT IS TAXED ON') + 1]).toBe(money(55_200));   // the $60,000 of wages less the $4,800 401(k) (DEC-0283)
    expect(C[C.indexOf('Federal tax bracket') + 2]).toBe('12%');
    const S = signUpWith(WITH_BENEFITS, 'income_tax');
    expect(S).toContain('~7.41% federal income tax · 12% bracket (2026)');   // $4,444 ÷ $60,000 = 7.4067%
    // what it is taxed on is the gross less the 401(k) (MK-CF-M-041, DEC-0283; 2026-10-24): $60,000 − $4,800 = $55,200
    expect(S).toContain(`On the ~${money(55_200)} it is taxed on — your gross less your 401(k) — from the IRS schedule after the standard deduction. It does NOT include Social Security and Medicare — about another 7.7% of a wage — or any state tax.`);
    expect(S).toContain('Use the calculated rate (~7.41%)');   // $4,444 ÷ $60,000 = 7.4067%
    // what sign-up said until 2026-10-24: the total of every source, called gross, and its bracket
    expect(S.join(' ')).not.toMatch(/68,400|22% bracket/);
  });
  test('the income recap of the same household reads the same rate: tax ~7% on what it is taxed on', () => {
    const S = signUpWith(WITH_BENEFITS, 'recap_income');
    expect(S[S.indexOf('Tax (~7.41% of your gross)') + 1]).toBe(money(-(4_444)));
  });
});

/** THE BRACKET OF WHAT IS TAXED, ON BOTH SCREENS (2026-10-24, CF-FIX; audit finding B05 (DEC-0185) and his DEC-0283: a 401(k) comes off before tax).
 *  Single, $70,000 of wages, $10,000 into a 401(k), no rate typed. The tax is worked on $70,000 − $10,000 − $16,100 = $43,900:
 *  $1,240 + 12% × $31,500 = $5,020, the 12% bracket. The bracket was read off the gross — $70,000 − $16,100 = $53,900, the 22%
 *  bracket — so the screen named a band the tax was not worked in. Both screens now read one function (taxedAfterPreTax). */
describe('the bracket reads the income the tax is worked on — sign-up and Cash flow alike', () => {
  const SEVENTY = { ...PAT, baseSalary: String(70_000 / 12), salaryFreq: 'monthly', c_401k: String(10_000 / 12) };
  const screens = () => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, onboardingProfile: SEVENTY } as any);
    const C = require('../screens/IncomeSummaryScreen').default;
    const r = render(<C />); const cf = readLines(); r.unmount();
    useStore.getState().resetAll();
    const r2 = render(<>{renderStep('income_tax' as any, { status: 'employed', tracks: [], answers: SEVENTY, setAnswer: jest.fn() } as any)}</>);
    const su = readLines(); r2.unmount();
    return { cf, su };
  };
  test('the one income: $60,000 once the 401(k) is out, and $5,020 of tax on it', () => {
    const { taxedAfterPreTax } = require('../domain/income/tax-rate');
    expect(taxedAfterPreTax(SEVENTY)).toBeCloseTo(60_000, 6);
    expect(incomeTaxRate(SEVENTY) * 70_000).toBeCloseTo(5_020, 6);
  });
  test('Cash flow: Gross /year $70,000, What it is taxed on $60,000 · Federal tax bracket 12% · tax ≈$5,020 — sign-up: ~7% · 12% bracket', () => {
    const { cf, su } = screens();
    expect(cf[cf.indexOf('WHAT IT IS TAXED ON') + 1]).toBe(money(60_000));   // $70,000 − the $10,000 401(k) (DEC-0283)
    expect(cf[cf.indexOf('= Gross /year') + 1]).toBe(money(70_000));
    expect(cf[cf.indexOf('Federal tax bracket') + 2]).toBe('12%');
    expect(cf[cf.indexOf('Calculated federal tax') + 2]).toBe(`≈${money(5_020)}/year`);
    expect(su).toContain('~7.17% federal income tax · 12% bracket (2026)');   // $5,020 ÷ $70,000 = 7.1714% (the tax on $60,000 taxed)
    expect(su.join(' ')).not.toMatch(/22% bracket/);   // the gross band, read until 2026-10-24
  });
});

/** DEC-7608 (2026-10-23): the Income summary's closing line names a state rate the person typed, because the calculated rate
 *  (MK-CF-F-181 rateInForce) already includes it. Pat types his own 24% and, on the Tax organizer, a 5% state rate. With no
 *  state rate typed the line reads as income-end-to-end_v07 frame 5a draws it. */
describe('DEC-7608 — the Income summary names a typed state rate', () => {
  const closingOf = (answers: any): string => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, onboardingProfile: answers } as any);
    const C = require('../screens/IncomeSummaryScreen').default;
    const r = render(<C />); const L = readLines(); r.unmount();
    const line = L.find((l) => /every source counted\. Your \d+\.\d{2}%/.test(l));   // two decimals since 2026-10-26 (MK-CF-M-081, the rate in force; Q49; income-end-to-end_v07 row of that date)
    expect(line).toBeDefined();
    return line as string;
  };
  const OWN = { ...PAT, taxMode: 'manual', manualTaxRate: '24' };
  test('with a 5% state rate typed: "… federal income tax, plus the 5.00% state rate you entered, assuming the standard deduction."', () => {
    const answers = { ...OWN, stateTaxRate: '5' };
    const shown = (rateInForce(answers as any).rate * 100).toFixed(2);
    expect(shown).toBe('24.00');
    expect(closingOf(answers)).toBe(`Single, every source counted. Your ${shown}%, used on every figure built from your take-home. `
      + 'Without it we show the calculated rate — federal income tax, plus the 5.00% state rate you entered, assuming the standard deduction.');
  });
  test('with no state rate typed, the line reads as the drawing draws it', () => {
    expect(closingOf(OWN)).toBe('Single, every source counted. Your 24.00%, used on every figure built from your take-home. '
      + 'Without it we show the calculated rate — federal income tax only, assuming the standard deduction.');
  });
});

/** THE LINE UNDER A CALCULATED TAX, the same class (2026-10-24): no rate typed, a 5% state rate entered — the calculated rate is
 *  the federal rate plus 5% (MK-CF-F-181), so the line names it; with no state rate it reads as built. */
describe('the line under a calculated tax names a state rate entered', () => {
  const noteOf = (answers: any): string => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, onboardingProfile: answers } as any);
    const C = require('../screens/IncomeSummaryScreen').default;
    const r = render(<C />); const L = readLines(); r.unmount();
    // with a state rate entered the row is "Calculated tax" — it is not federal only (the lead's ruling, 2026-10-25; canon row 25)
    const at = L.indexOf('Calculated federal tax') >= 0 ? L.indexOf('Calculated federal tax') : L.indexOf('Calculated tax');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(L[at]).toBe(answers?.stateTaxRate ? 'Calculated tax' : 'Calculated federal tax');
    return L[at + 3];
  };
  test('5% state rate entered: the rate in force holds it, and the line says so', () => {
    const answers = { ...PAT, stateTaxRate: '5' };
    // $4,444 federal + 5% of the $39,100 taxed = $6,399 a year, as a share of $60,000 — the calculated rate shown above the line
    expect(rateInForce(answers as any).rate * 60_000).toBeCloseTo(4_444 + 0.05 * 39_100, 6);
    expect(noteOf(answers)).toBe('Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.');
  });
  test('no state rate entered: "Federal only — …" as built', () => {
    expect(noteOf(PAT)).toBe('Federal only — it knows nothing about your state, and nothing about Social Security or Medicare.');
  });
});

/** WHAT IT IS TAXED ON, SHOWN BEING MADE (2026-10-24, CF-FIX; his DEC-0283: gross is before any deductions, and income before
 *  tax is gross less the 401(k)). The Income summary's own worked household: two earners filing jointly, $109,200 and $60,000
 *  of wages, $1,200 and $400 a month into 401(k)s ($19,200 a year). It printed "What it is taxed on $169,200" — the gross —
 *  while the bracket and a calculated tax were worked on $150,000. And MK-CF-M-044's worked example ran a typed 22%. */
describe('the Income summary shows what it is taxed on being made, and a calculated tax on it', () => {
  const COUPLE = { status: 'employed', incomeSources: ['employment'], filingStatus: 'married', whoEarns: 'both', hasPartner: 'yes',
    baseSalary: '4200', salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: '1200', partnerName: 'Sam',
    partnerWage: { baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '400' } };
  const summary = (answers: any): string[] => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
    useStore.setState({ hideBalances: false, onboardingProfile: answers } as any);
    const C = require('../screens/IncomeSummaryScreen').default;
    const r = render(<C />); const L = readLines(); r.unmount(); return L;
  };
  test('the rows add up: = Gross /year $169,200 · Your 401(k)s −$19,200 · = What it is taxed on $150,000, the figure in the band', () => {
    const L = summary(COUPLE);
    expect(L[L.indexOf('WHAT IT IS TAXED ON') + 1]).toBe(money(150_000));
    expect(L[L.indexOf('= Gross /year') + 1]).toBe(money(169_200));
    expect(L[L.indexOf('Your 401(k)s') + 1]).toBe(`−${money(19_200)}`);
    expect(L[L.indexOf('= What it is taxed on') + 1]).toBe(money(150_000));
    expect(169_200 - 19_200).toBe(150_000);
    // the bracket is read on the $150,000: less $32,200, $117,800 is in the 22% joint band
    expect(L[L.indexOf('Federal tax bracket') + 2]).toBe('22%');
  });
  test('MK-CF-M-044, no rate typed: ≈$15,340 a year — federal tax on $150,000 less $32,200 ($2,480 + $9,120 + 22% × $17,000)', () => {
    const L = summary(COUPLE);
    expect(L[L.indexOf('Calculated federal tax') + 2]).toBe(`≈${money(15_340)}/year`);
    expect(incomeTaxRate(COUPLE) * 169_200).toBeCloseTo(15_340, 6);
  });
  test('with a typed 22% the tax row is that share of the gross, $37,224, and the taxed rows read the same', () => {
    const L = summary({ ...COUPLE, taxMode: 'manual', manualTaxRate: '22' });
    expect(L[L.indexOf('= What it is taxed on') + 1]).toBe(money(150_000));
    expect(L.some((l) => l === `${money(37_224)}/year`)).toBe(true);
  });
  test('with no 401(k) the two totals are the same, and the 401(k) row reads $0', () => {
    const L = summary({ ...COUPLE, c_401k: '0', partnerWage: { ...COUPLE.partnerWage, c_401k: '0' } });
    expect([L[L.indexOf('= Gross /year') + 1], L[L.indexOf('= What it is taxed on') + 1]]).toEqual([money(169_200), money(169_200)]);
    expect(L[L.indexOf('Your 401(k)s') + 1]).toBe(money(0));   // a real $0, no sign
  });
});

// THE OLD ANSWER, KEPT (the fix wave's rule): until 2026-10-31 sign-up typed a hyphen before a money figure, "-$4,444". One money formatter
// writes the minus sign "−" now (SU3-02); this fails because no hyphen is printed. The day it passes, a hyphen has come back.
test.failing('before 2026-10-31, kept · a money figure taken out was written with a hyphen', () => {
  expect(money(-1)).toBe(`-${money(1)}`);
});
