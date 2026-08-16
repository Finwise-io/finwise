// The seven questions, shown ALWAYS — founder finding, 2026-08-14.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlanGlanceRows, buildGlanceRows } from '../PlanGlanceRows';
import { useStore } from '../../store/useStore';

const DEFAULTS = { retireAge: 65, horizonAge: 90 };
const dayOne = () => buildGlanceRows({
  age: null, retireAge: null, horizonAge: null, spendMonthly: null,
  targetNestEgg: null, counted: null, bigCosts: null, defaults: DEFAULTS,
});
beforeEach(() => { useStore.setState({ hideBalances: false } as any); });

test('SEVEN rows on day one — not three, which is what the design drew', () => {
  render(<PlanGlanceRows rows={dayOne()} />);
  for (const q of ['How old are you?', 'When do you want to retire?', 'How long should the money last?',
                   'What will you spend each month in retirement?', "What's your target nest egg?",
                   'What counts toward retirement?', 'What big one-time costs are coming?']) {
    expect(screen.getByText(q)).toBeOnTheScreen();
  }
});

test('the four assumptions are SHOWN and tagged as ours — hiding them hid what the number stands on', () => {
  render(<PlanGlanceRows rows={dayOne()} />);
  expect(screen.getByText('65')).toBeOnTheScreen();      // retire age, our default
  expect(screen.getByText('90')).toBeOnTheScreen();      // plan-to age, our default
  expect(screen.getAllByText('ours').length).toBe(2);
});

test('the "ours" tag is NOT amber — amber means act on this, and nothing is wrong here', () => {
  render(<PlanGlanceRows rows={dayOne()} />);
  const tag = screen.getAllByText('ours')[0];
  const style = Array.isArray(tag.props.style) ? Object.assign({}, ...tag.props.style.filter(Boolean)) : tag.props.style;
  expect(style.color).not.toBe('#854F0B');              // Colors.amber
});

test('what we are waiting on says Add or Link — never a fake zero', () => {
  render(<PlanGlanceRows rows={dayOne()} />);
  expect(screen.getAllByText('Add ›').length).toBe(3);   // age, spending, target
  expect(screen.getByText('Link ›')).toBeOnTheScreen();  // accounts are linked, not typed
  expect(screen.queryByText('$0')).toBeNull();
});

test('"None" for big costs is an answer, not a fake zero', () => {
  render(<PlanGlanceRows rows={dayOne()} />);
  expect(screen.getByText('None')).toBeOnTheScreen();
});

test('once answered, a row shows the value and drops the tag', () => {
  render(<PlanGlanceRows rows={buildGlanceRows({
    age: 58, retireAge: 65, horizonAge: 90, spendMonthly: 5200,
    targetNestEgg: 2_000_000, counted: 909_152, bigCosts: 18_000, defaults: DEFAULTS,
  })} />);
  expect(screen.queryByText('ours')).toBeNull();
  expect(screen.getByText('$2,000,000')).toBeOnTheScreen();
  expect(screen.getByText('$909,152')).toBeOnTheScreen();
  expect(screen.queryByText('Add ›')).toBeNull();
});

test('every row says out loud whether it is theirs or ours', () => {
  render(<PlanGlanceRows rows={dayOne()} />);
  expect(screen.getByLabelText(/When do you want to retire\? 65, our assumption until you change it/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/How old are you\? not answered yet, tap to add/)).toBeOnTheScreen();
});
