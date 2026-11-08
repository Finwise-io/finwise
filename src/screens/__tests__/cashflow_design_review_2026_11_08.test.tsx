/**
 * CASH FLOW, THE DESIGN REVIEW'S FIXES (2026-11-08) — under his existing rulings, none of them on an approved drawing's words:
 *  · a month below $0 names its biggest amount going out (biggestOutLine), and PLANNED offers the budget
 *  · the future-month notes in plain words, with the month's one word, "short month" · "Your base pay" in the income chooser
 *  · "Every expense" for the full list (it read "All transactions") · "Surplus after your Plan" (it read "… your budget")
 *  · the setup question says why a figure was not kept · the future paycheck card's bar runs edge to edge
 *  · full-screen lists start below the phone's own top edge · a debt is removed in its editor only, never by a hidden long press
 *  · the tabs say which one is selected · the scripted Cash flow journey checks the screen as it is today
 */
import * as fs from 'fs';
import * as path from 'path';
import { biggestOutLine } from '../../../MoneyKeel/functions/cashflow/this-month';

const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const CF = src('CashFlowScreen.tsx');

test('the coverage: the screens and the journey script are read', () => {
  expect(CF.length).toBeGreaterThan(40_000);
  expect(src('BudgetScreen.tsx').length).toBeGreaterThan(20_000);
});

describe('biggestOutLine — the biggest amount going out, as its row prints it', () => {
  test('a month of $5,000 in, a $3,000 mortgage, $2,400 expenses and a $300 car loan: the mortgage, −$3,000', () => {
    const lines = [{ label: 'Take-home', amount: 5000, kind: 'in' }, { label: 'Mortgage', amount: -3000, kind: 'debt' },
      { label: 'Expenses', amount: -2400, kind: 'spend' }, { label: 'Car loan', amount: -300, kind: 'debt' }] as any;
    expect(biggestOutLine(lines, [5000, -3000, -2400, -300])).toEqual({ label: 'Mortgage', amount: -3000 });
  });
  test('a row not set, a payment not entered and the money coming in are never the answer; nothing going out is null', () => {
    const lines = [{ label: 'Take-home', amount: 9000, kind: 'in' }, { label: 'Expenses', amount: 0, kind: 'spend', notSet: true },
      { label: 'Car loan', amount: 0, kind: 'debt', notEntered: true }] as any;
    expect(biggestOutLine(lines, [9000, -9999, -9999])).toBeNull();
    expect(biggestOutLine([], [])).toBeNull();
  });
});

test('a month below $0 says why on This month, PLANNED and ACTUAL alike, and PLANNED opens the budget', () => {
  expect(CF).toContain("belowZero('More is planned to go out this month than to come in.', biggestOutLine(planned.lines, pShown.amounts))");
  expect(CF).toContain("belowZero('More has gone out this month than come in so far.', biggestOutLine(actual.lines, aShown.amounts))");
  expect(CF).toMatch(/accessibilityLabel="Change your budget">\s*<Text style=\{styles\.link\}>Change your budget ›<\/Text>/);
});

test('the words: plain, and one word per thing', () => {
  for (const said of ['A short month: more is planned to go out than to come in.', 'Every figure for this month is a plan, not what happened.',
    "{ text: 'Your base pay', onPress: onSetup }", '>Every expense<', 'label="Surplus after your Plan"',
    'Enter an amount above $0 — rent, food and bills for a month, roughly.']) expect(CF).toContain(said);
  for (const old of ['A tight month you can see coming', 'never dressed as fact', "'Salary / take-home'", '>All transactions<',
    'Surplus after your budget', '≈$6,976']) expect(CF).not.toContain(old);
});

test('the future paycheck card is a plain card (its bar edge to edge), and the full-screen lists start below the top edge', () => {
  const card = CF.match(/\n {2}projCard: \{[^}]*\}/)![0];
  expect(card).not.toMatch(/borderStyle|borderRadius|borderWidth/);
  expect(card).toMatch(/marginHorizontal: -Spacing\.base/);
  expect(CF).not.toMatch(/paddingTop: 54/);
  expect((CF.match(/paddingTop: topEdge/g) ?? []).length).toBe(3);
});

test('a debt is removed in its editor only; the tabs say which is selected; the journey script asks for what exists', () => {
  expect(src('BudgetScreen.tsx')).not.toMatch(/onLongPress=\{\(\) => handleDeleteDebt/);
  expect(CF).toContain('accessibilityState={{ selected: surfTab === t }}');
  const flow = fs.readFileSync(path.join(__dirname, '..', '..', '..', '.maestro', 'cashflow.yaml'), 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');   // its steps, not its notes
  expect(flow).not.toMatch(/A TYPICAL MONTH|TAKE-HOME vs SPENDING|Cash-flow detail/);
  expect(flow).toContain('ACTUAL · SO FAR');
});
