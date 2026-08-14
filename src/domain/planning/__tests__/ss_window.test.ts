// WHEN IS "WHEN SHOULD I CLAIM?" A DECISION? (founder ruling 2026-08-13: 60 to 70.)
//
// Before this, the only bound was age < 71 — so a 58-year-old opened the Plan tab and was told the
// next decision in front of them was a Social Security window that opens in four years. The founder
// had already ruled on 2026-08-12 that this is not a decision in your fifties.
// The upper bound is 70 because the delayed credit stops accruing there: after 70, waiting buys
// nothing and there is nothing left to choose. 67 was considered and rejected — between 67 and 70
// waiting is worth 8% a year, which is the most valuable this decision ever gets.
import { nextDecision, SS_DECISION_FROM, SS_DECISION_TO } from '../hub';

const at = (age: number) => nextDecision({
  lens: 'preretired', age, birthYear: new Date().getFullYear() - age, ssClaimAge: null,
  preTaxBalance: 0, preTaxAccountIds: [], transactions: [], moneyWord: (n: number) => `$${n}`,
  alreadyClaiming: false,
} as any);

test('the window the founder set', () => {
  expect([SS_DECISION_FROM, SS_DECISION_TO]).toEqual([60, 70]);
});

test('not in your fifties — it is not yet a decision', () => {
  for (const age of [52, 58, 59]) expect(at(age)?.kind).not.toBe('ss-window');
});

test('live from 60 through 70', () => {
  for (const age of [60, 62, 67, 69, 70]) expect(at(age)?.kind).toBe('ss-window');
});

test('and gone after 70, because the delayed credit has stopped', () => {
  for (const age of [71, 74]) expect(at(age)?.kind).not.toBe('ss-window');
});

test('68 still counts — waiting is worth the most it will ever be worth there', () => {
  expect(at(68)?.kind).toBe('ss-window');
});

test('someone already drawing it is never asked', () => {
  expect(nextDecision({ lens: 'retired', age: 66, birthYear: 1960, ssClaimAge: null,
    preTaxBalance: 0, preTaxAccountIds: [], transactions: [], moneyWord: (n: number) => `$${n}`,
    alreadyClaiming: true } as any)?.kind).not.toBe('ss-window');
});
