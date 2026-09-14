/**
 * YOUR BASE PAY — the screen, against the approved mock.
 *
 * MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v05.html, frames 2a–2e. The mock is the spec: these check
 * the elements, the words, and — the part a presence check cannot prove — that the numbers on it
 * come from MK-CF-O-001 and add up.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';

const setProfile = (op: any) => useStore.setState({ onboardingProfile: op, onboardingComplete: true } as any);
const ME = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000' };
const SAM = { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' };

test('2a — the screen names itself and says what it is NOT for', () => {
  setProfile(ME);
  render(<BasePayScreen />);
  expect(screen.getByText('Your base pay')).toBeOnTheScreen();
  expect(screen.getByText('Bonus, stocks and other income are captured separately')).toBeOnTheScreen();
  expect(screen.getByText('Who earns a wage?')).toBeOnTheScreen();
});

test('2a — one earner: the household block shows gross, a band and what lands', () => {
  setProfile(ME);
  render(<BasePayScreen />);
  expect(screen.getByText('Gross /year')).toBeOnTheScreen();
  expect(screen.getByText('$84,000')).toBeOnTheScreen();          // 7,000 x 12
  expect(screen.getByText('= Take-home')).toBeOnTheScreen();
  expect(screen.getAllByText('$5,000/month').length).toBeGreaterThan(0);   // the band figure repeats it (v6 #7)
  // with one wage there is no second band to compare against, so no note is invented
  expect(screen.queryByText(/what you earn together/)).toBeNull();
});

test('2a — two earners: a section each, and the household is their sum', () => {
  setProfile({ ...ME, whoEarns: 'both', partnerName: 'Sam', partnerWage: SAM, filingStatus: 'married' });
  render(<BasePayScreen />);
  expect(screen.getByText('You')).toBeOnTheScreen();
  expect(screen.getByText('Sam')).toBeOnTheScreen();
  expect(screen.getByText('$138,000')).toBeOnTheScreen();          // 84,000 + 54,000
  expect(screen.getAllByText('$8,300/month').length).toBeGreaterThan(0);   // 5,000 + 3,300
  // v6 (founder device feedback #3): ONE bracket row — the old band pair is gone, its comparison
  // lives in the sentence below the card.
  expect(screen.getByText('Federal tax bracket')).toBeOnTheScreen();
  expect(screen.queryByText('Your tax band on both')).toBeNull();
  expect(screen.getByText(/Both figures are what you entered/)).toBeOnTheScreen();
});

test('2b — a section opens on its own, and closed it is one line', () => {
  setProfile({ ...ME, whoEarns: 'both', partnerName: 'Sam', partnerWage: SAM });
  render(<BasePayScreen />);
  // mine opens first; Sam's is closed, so Sam's questions are not on screen
  expect(screen.getByText('How often you are paid')).toBeOnTheScreen();
  expect(screen.queryByText('How often Sam is paid')).toBeNull();
  fireEvent.press(screen.getByLabelText(/^Sam:/));
  expect(screen.getByText('How often Sam is paid')).toBeOnTheScreen();
});

test('2c — a fortnightly earner is asked for a FORTNIGHT, and the months are still months', () => {
  setProfile({ ...ME, salaryFreq: 'biweekly', salaryMonthMode: 'months' });
  render(<BasePayScreen />);
  expect(screen.getByText('Gross pay a fortnight')).toBeOnTheScreen();
  expect(screen.getByText('A typical one. Every month below starts from this.')).toBeOnTheScreen();
});

test('2c — the table is fourteen months, last month first, each carrying its year', () => {
  setProfile({ ...ME, salaryMonthMode: 'months' });
  render(<BasePayScreen />);
  const cells = screen.getAllByLabelText(/gross pay$/);
  expect(cells).toHaveLength(14);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  expect(screen.getByLabelText(`${ABBR[last.getMonth()]} ${String(last.getFullYear()).slice(2)} gross pay`)).toBeOnTheScreen();
});

test('2d — three figures that cannot all be true are refused, and Save waits', () => {
  setProfile({ ...ME, baseSalary: '5500' });   // 5,500 − 800 = 4,700, but 5,000 is said to land
  render(<BasePayScreen />);
  expect(screen.getByText(/cannot all be right/)).toBeOnTheScreen();
  const save = screen.getByLabelText('Save your base pay');
  expect(save).toBeDisabled();
});

// 2e — ONE COMPONENT, TWO FRAMES. Onboarding renders this very screen as its base-pay step, so the
// questions cannot drift from the ones Cash flow opens. The onboarding host owns the chrome — its own
// progress bar, its own Continue — so the component contributes only the questions, and writes as it
// goes rather than on a Save button the host will never press.
test('2e — the same component in onboarding: the host owns the chrome, the questions are identical', () => {
  setProfile(ME);
  render(<BasePayScreen frame="onboarding" />);
  expect(screen.getByText('How often you are paid')).toBeOnTheScreen();   // identical questions
  expect(screen.getByText('Who earns a wage?')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Back to Income')).toBeNull();
  expect(screen.queryByLabelText('Save your base pay')).toBeNull();       // the host's Continue moves on
});

test('2e — in onboarding an answer is kept the moment it is given', () => {
  setProfile({ ...ME, partnerName: 'Sam' });
  render(<BasePayScreen frame="onboarding" />);
  fireEvent.press(screen.getByLabelText('Both of us'));
  expect((useStore.getState() as any).onboardingProfile.whoEarns).toBe('both');
});

test('saving writes BOTH wages, and records who earns', () => {
  setProfile({ ...ME, partnerName: 'Sam' });
  const done = jest.fn();
  render(<BasePayScreen onDone={done} />);
  fireEvent.press(screen.getByLabelText('Both of us'));
  fireEvent.press(screen.getByLabelText('Save your base pay'));
  const op = (useStore.getState() as any).onboardingProfile;
  expect(op.whoEarns).toBe('both');
  expect(op.baseSalary).toBe('7000');
  expect(op.partnerWage).toBeTruthy();
  expect(done).toHaveBeenCalled();
});
