/** A TOTAL AGREES WITH ITS OWN LINES — the founder's ruling of 2026-09-12, as a test.
 *
 *  His words on income-end-to-end v07: the household row read ≈$10,442/month while the take-home line
 *  under it read ≈$9,242 — *"one card disagreeing with itself; corrected to ≈$9,242."* The lines are
 *  right and the total follows them. That was corrected in the MOCK; nothing in the code held it, so
 *  the same disagreement was live on the Income screen, one screen over, when the worked example was
 *  written on 2026-09-28.
 *
 *  It is the same class three times over: B05 (2026-08-26, a 401(k) taxed at all), the 2026-08-27 row
 *  (*"a second implementation cannot be fixed by fixing the first"*), and this. A ruling that lives
 *  only in a changelog gets re-broken. This is the ruling with teeth.
 *
 *  THE HOLE IT CLOSES: the take-home guards already walked every persona and all of them passed while
 *  a spouse's 401(k) was going unsubtracted — because not one persona had a spouse with their own wage
 *  and their own contribution. `twoEarnersBoth401k` exists so this road is travelled.
 */
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { ALL_PERSONAS, twoEarnersBoth401k } from '../testing/personas';
import { householdPreTaxContributionsAnnual } from '../domain/income';

test('THE RULING — the Income screen\'s "=" row equals the lines printed above it, where every source is a line', () => {
  const s = incomeSummary(twoEarnersBoth401k as any);
  const lines = s.lands.lines.reduce((t, l) => t + l.amount, 0);
  // two wages, both lines, nothing else coming in — so the total can only be their sum
  expect(s.lands.lines.length).toBe(2);
  expect(s.lands.usualMonth).toBeCloseTo(lines, 2);
});

test('the 401(k) taken off a household gross is EVERY earner\'s, never the first one\'s', () => {
  // $1,200 + $400 a month, both of them — the figure the grid must use
  expect(householdPreTaxContributionsAnnual(twoEarnersBoth401k as any)).toBeCloseTo(19200, 2);
});

test('no persona reads a take-home that includes money it also says was contributed', () => {
  const wrong: string[] = [];
  for (const { name, op } of ALL_PERSONAS) {
    const own = Number((op as any).c_401k) || 0;
    const household = householdPreTaxContributionsAnnual(op as any) / 12;
    if (household < own - 0.01) wrong.push(`${name}: household ${household} is below the first earner's ${own}`);
  }
  expect(wrong).toEqual([]);
});
