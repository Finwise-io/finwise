/** THE TAX ORGANIZER, ROUND 6 (2026-11-02, FX-CF-C). It has no drawing; each figure is worked by hand here.
 *
 *  CF6-14 (R27): a wage that cannot be read never prints as $0. With nothing else to count, there is no Gross figure, only R23's
 *  sentence; with rent beside it, the total counts the rent and says the wage is left out ("Gross income, not counting your wage",
 *  the Income summary's words), and the rows printed add to it. "W-2 from each employer" stays on the list: a job is entered.
 *  R28: a 401(k) typed $1,666.67 a month is $20,000.04 a year, printed to the cent, so the printed lines work to the printed rate.
 *  The shared PDF: an empty 401(k) reads "$0", never "−$0"; interest the app calculated keeps its "~".
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { theTaxOrganizer } from '../../../MoneyKeel/functions/cashflow/tax-organizer';
import { PAY_FREQUENCY_NOT_RECOGNISED } from '../../domain/income/pay-frequency';
import { renderedLines } from '../../testing/drawnLines';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [], useFocusEffect: () => {}, router: { push: jest.fn(), back: jest.fn() },
}));

const DAY = new Date(2026, 10, 2, 12);
beforeEach(() => { jest.useFakeTimers({ now: DAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] }); });
afterEach(() => { jest.useRealTimers(); });
const open = (profile: any, accounts: any[] = []) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: profile, assetAccounts: accounts } as any);
  const C = require('../TaxOrganizerScreen').default;
  render(<C />);
  return renderedLines(screen.toJSON());
};
const after = (lines: string[], label: string) => lines[lines.indexOf(label) + 1];
const UNREADABLE = { status: 'employed', incomeSources: ['employment'], filingStatus: 'single', baseSalary: '5000', salaryFreq: 'semimonthly', salaryMode: 'gross' };
const RENT = { incomeSources: ['employment', 'rental'], rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'flat' }] };

describe('CF6-14 (R27): an unreadable wage never prints as $0', () => {
  test('the wage alone: no Gross figure — R23\'s sentence instead — and the W-2 is still to gather', () => {
    const l = open(UNREADABLE);
    expect(l).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
    expect(l.filter((x) => /^Gross income/.test(x))).toEqual([]);
    expect(l).not.toContain('$0');
    const org = theTaxOrganizer({ profile: UNREADABLE, accounts: [], debts: [], transactions: [], year: 2026 });
    expect(org.documents).toContain('W-2 from each employer');
  });
  test('with rent beside it: "Gross income, not counting your wage" $14,400 — (1,800 − 600) × 12 — and the rows add to it', () => {
    const l = open({ ...UNREADABLE, ...RENT });
    expect(after(l, 'Rental (net)')).toBe('$14,400');
    expect(after(l, 'Gross income, not counting your wage')).toBe('$14,400');
    expect(l).not.toContain('Gross income');   // never the bare label over a total that leaves the wage out
    expect(l).toContain(PAY_FREQUENCY_NOT_RECOGNISED);
  });
  test.failing('the screen until 2026-11-02, pinned: "Gross income" $0 for the unreadable wage (FIXED 2026-11-02, CF6-14)', () => {
    const l = open(UNREADABLE);
    expect(after(l, 'Gross income')).toBe('$0');
  });
});

describe('R28: a year from a typed month prints as typed × 12', () => {
  const P = { status: 'employed', incomeSources: ['employment'], filingStatus: 'single', birthYear: '1980', baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross' };
  test('$1,666.67/month: −$20,000.04, taxable $83,899.96, rate 10.97% — the printed lines work to the printed rate', () => {
    const l = open({ ...P, c_401k: '1666.67' });
    // by hand: 1,666.67 × 12 = 20,000.04; 120,000 − 20,000.04 − 16,100 = 83,899.96;
    // tax 10% × 12,400 + 12% × 38,000 + 22% × (83,899.96 − 50,400) = 1,240 + 4,560 + 7,369.9912 = 13,169.9912; ÷ 120,000 = 10.9749927% → 10.97%
    expect(after(l, '401(k) contribution')).toBe('−$20,000.04');
    expect(after(l, 'Taxable income')).toBe('$83,899.96');
    expect(l.some((x) => /10\.97% of the year’s income/.test(x))).toBe(true);
    expect(1_240 + 4_560 + 0.22 * (83_899.96 - 50_400)).toBeCloseTo(13_169.9912, 6);
  });
  test('a whole year stays whole: $20,000 (20,000 ÷ 12 a month) → −$20,000, $83,900, 10.98%', () => {
    const l = open({ ...P, c_401k: String(20000 / 12) });
    expect(after(l, '401(k) contribution')).toBe('−$20,000');
    expect(after(l, 'Taxable income')).toBe('$83,900');
    expect(l.some((x) => /10\.98% of the year’s income/.test(x))).toBe(true);   // 13,170 ÷ 120,000 = 10.975% → 10.98%
  });
});

describe('the shared PDF', () => {
  const { orgToHtml } = require('../TaxOrganizerScreen');
  test('an empty 401(k) reads "$0", never "−$0"; a typed $1,666.67 a month reads "−$20,000.04"', () => {
    const P = { status: 'employed', incomeSources: ['employment'], filingStatus: 'single', baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross' };
    const none = orgToHtml(theTaxOrganizer({ profile: P, accounts: [], debts: [], transactions: [], year: 2026 }));
    expect(none).toMatch(/401\(k\) contribution<\/td><td style="text-align:right">\$0<\/td>/);
    expect(none).not.toContain('−$0');
    const typed = orgToHtml(theTaxOrganizer({ profile: { ...P, c_401k: '1666.67' }, accounts: [], debts: [], transactions: [], year: 2026 }));
    expect(typed).toContain('−$20,000.04');
    expect(typed).toContain('$83,899.96');
  });
  test('interest the app calculated keeps its "~": a $10,000 Treasury at 4% → ~$400', () => {
    const tsy = { asset_id: 't', label: 'Treasury 2030', kind: 'treasury', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 10000, coupon_rate: 0.04, face_value: 10000, maturity_date: '2030-05-15' };
    const html = orgToHtml(theTaxOrganizer({ profile: { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', salaryMode: 'gross' }, accounts: [tsy], debts: [], transactions: [], year: 2026 }));
    expect(html).toMatch(/Interest &(amp;)? dividends<\/td><td style="text-align:right">~\$400</);
  });
});

// R28 follow-up (2026-11-02): to the cent FIRST — a stored $1,666.6667 a month is $20,000.0004 a year, $20,000.00 to the cent: whole
test('a stored $1,666.6667 a month prints whole on the screen and in the PDF: −$20,000 and $83,900; a typed $1,666.67 keeps $20,000.04', () => {
  const P = { status: 'employed', incomeSources: ['employment'], filingStatus: 'single', birthYear: '1980', baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross' };
  const l = open({ ...P, c_401k: '1666.6667' });
  expect(after(l, '401(k) contribution')).toBe('−$20,000');
  expect(after(l, 'Taxable income')).toBe('$83,900');
  const { orgToHtml } = require('../TaxOrganizerScreen');
  const html = orgToHtml(theTaxOrganizer({ profile: { ...P, c_401k: '1666.6667' }, accounts: [], debts: [], transactions: [], year: 2026 }));
  expect(html).toContain('−$20,000<');
  expect(html).toContain('$83,900<');
  expect(orgToHtml(theTaxOrganizer({ profile: { ...P, c_401k: '1666.67' }, accounts: [], debts: [], transactions: [], year: 2026 }))).toContain('−$20,000.04');
});
