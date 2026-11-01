/** ONE TYPED 401(k) AMOUNT, READ ACROSS THE SCREENS THAT PRINT IT (2026-10-31, FX-CF-C; CR3-01, the lead's ruling R13; tenets 2 and 4).
 *
 *  The monthly 401(k) the person typed (MK-XS-I-043, c_401k) is printed as a monthly figure on two screens: Contribution room
 *  ("At $X/month you will put in …", MK-MN-M-032) and Base pay ("Your 401(k)s $X/month", MK-CF-M-034, and the card's own sum). Every other
 *  screen prints a year total, a room, or the sum of every contribution — read 2026-10-31: Income summary and the Tax organizer (the
 *  year's 401(k)s), Home and Insights (the room; "Annual contributions"), the Retirement cockpit (the room; the plan's saving a month),
 *  the Plan hub (passes it, prints nothing of it), sign-up (the box as typed; the year). The Roth, IRA and HSA amounts are printed as a
 *  monthly figure on Contribution room only.
 *
 *  The rule (contribution-room v02 row 7; income-end-to-end v07 row of 2026-10-31): an amount typed whole reads whole on both screens.
 *  Typed with cents, Contribution room prints it to the cent so its year adds up ($3,333.33 × 12 = $39,999.96, shown $40,000), and Base
 *  pay keeps it to the dollar so its card's own sum adds up — tenet 2 (rows add up) outranks tenet 4 (one figure, one form).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { renderedLines } from '../../testing/drawnLines';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [], useFocusEffect: () => {},
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const DAY = new Date(2026, 9, 31, 12);
beforeEach(() => { jest.useFakeTimers({ now: DAY, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] }); });
afterEach(() => { jest.useRealTimers(); });

const person = (c_401k: string) => ({ status: 'employed', incomeSources: ['employment'], birthYear: '1966', baseSalary: '11500', salaryFreq: 'monthly', salaryMode: 'gross', c_401k });
const openOn = (screenName: 'ContributionRoomScreen' | 'BasePayScreen', profile: any): string[] => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: profile } as any);
  const C = require(`../${screenName}`).default;
  const r = render(<C />);
  const lines = renderedLines(screen.toJSON());
  r.unmount();
  return lines;
};
const baseRow = (lines: string[]) => lines[lines.indexOf('Your 401(k)s') + 1];
const roomMonth = (lines: string[]) => (lines.find((l) => l.startsWith('At $') && l.includes('/month you will put in')) ?? '').match(/^At (\$[\d,.]+\/month)/)?.[1];

test('typed whole ($1,200): both screens print "$1,200/month" — one amount, one form', () => {
  const room = openOn('ContributionRoomScreen', person('1200'));
  const base = openOn('BasePayScreen', person('1200'));
  expect(roomMonth(room)).toBe('$1,200/month');
  expect(baseRow(base)).toBe('$1,200/month');
  expect(roomMonth(room)).toBe(baseRow(base));
});

test('typed with cents ($3,333.33): Contribution room to the cent so its year adds up; Base pay to the dollar so its own sum adds up', () => {
  const room = openOn('ContributionRoomScreen', person('3333.33'));
  expect(room).toContain('At $3,333.33/month you will put in $40,000 this year — $4,250 over the $35,750 limit. Money over the limit has to come out by April 15 next year, or it is taxed twice. Calculated from the monthly amount you entered — check it against your latest statement. (Includes the age 60–63 catch-up.)');
  expect(Math.round(3333.33 * 12)).toBe(40_000);   // $39,999.96, a total, shown to the dollar
  const base = openOn('BasePayScreen', person('3333.33'));
  expect(baseRow(base)).toBe('$3,333/month');
  // the card's own sentence adds up to the dollar: $11,500 gross − $T tax − $3,333 of 401(k)s = $Y
  const sum = base.find((l) => /^\$[\d,]+ gross − \$[\d,]+ tax − \$[\d,]+ of 401\(k\)s = \$[\d,]+\.$/.test(l));
  expect(sum).toBeDefined();
  const n = (sum as string).match(/\$[\d,]+/g)!.map((x) => Number(x.replace(/[$,]/g, '')));
  expect(n[0] - n[1] - n[2]).toBe(n[3]);
  expect(n[2]).toBe(3_333);
});
