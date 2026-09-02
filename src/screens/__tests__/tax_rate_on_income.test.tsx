/**
 * THE TAX RATE, ON THE INCOME SCREEN — approved mock income-v5, frames 2a and 2a-ii.
 *
 * Two faults, one screen. The rate could only be changed on the Taxes step inside the guided
 * questionnaire — which was itself unreachable until 28 August. And the question asked for an
 * "effective tax rate % — from last year's return", while our figure is FEDERAL INCOME TAX ONLY:
 * about 12 points lower than a return once Social Security, Medicare and a state are in it. A person
 * could type 18 against our 9.2 and both be right.
 *
 * Founder ruling 2026-08-28: the estimate stays federal — payroll tax applies to WAGES, and our gross
 * also carries rent, dividends and bonuses, so applying 7.65% to it would be wrong, not merely
 * imprecise. So: say what it covers, name the gap in money, and let it be corrected where it is shown.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import { useStore } from '../../store/useStore';

const set = (op: any) => useStore.setState({ onboardingProfile: op, onboardingComplete: true } as any);
const TOLD_US   = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000' };
const ESTIMATED = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800' };   // no landsTypical

test('when they told us what lands, the figures are THEIRS — read back, never estimated', () => {
  set(TOLD_US);
  render(<BasePayScreen />);
  // v6: the entered card shows their own figure back — "Everything taken out · what you told us" —
  // and says in a sentence that nothing is estimated.
  expect(screen.getAllByText('Everything else taken out').length).toBeGreaterThan(0);
  expect(screen.getByText('what you told us')).toBeOnTheScreen();
  expect(screen.getByText(/nothing here is calculated/)).toBeOnTheScreen();
  expect(screen.queryByText('Calculated federal tax')).toBeNull();
  expect(screen.queryByText(/Federal income tax only\./)).toBeNull();   // no shortfall warning
});

test('the bracket is NAMED, and the estimate says what it assumed', () => {
  set(ESTIMATED);
  render(<BasePayScreen />);
  expect(screen.getByText('Federal tax bracket')).toBeOnTheScreen();
  expect(screen.getByText('Calculated federal tax')).toBeOnTheScreen();
  expect(screen.getByText('assumes you take the standard deduction')).toBeOnTheScreen();
  // the tax figure is MONEY, as a payslip shows it — never a percentage. Two rows carry a ≈$/mo
  // figure here: the tax, and what lands. Neither may carry a % — that was the confusion.
  // v6: three ≈ figures — the band echo, the estimated tax, and the lands total (#7, #8)
  expect(screen.getAllByText(/^≈\$[\d,]+\/mo$/).length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/\$[\d,]+ · \d+%$/)).toBeNull();
});

test('when we are estimating, it names the shortfall IN MONEY', () => {
  set(ESTIMATED);
  render(<BasePayScreen />);
  expect(screen.getByText(/Federal income tax only\./)).toBeOnTheScreen();
  expect(screen.getByText(/Social Security and Medicare take about another 7\.7%/)).toBeOnTheScreen();
  expect(screen.getByText(/reads high — by roughly \$[\d,]+ a month/)).toBeOnTheScreen();
});

test('the field asks for a payslip figure — never an "effective tax rate"', () => {
  set(ESTIMATED);
  render(<BasePayScreen />);
  expect(screen.getByLabelText('The tax rate you want us to use')).toBeOnTheScreen();
  expect(screen.getByText(/add up every deduction except your 401\(k\)/)).toBeOnTheScreen();
  expect(screen.queryByText(/effective tax rate/i)).toBeNull();
});

test('a rate typed here is the rate the whole app uses', () => {
  set(ESTIMATED);
  render(<BasePayScreen />);
  fireEvent.changeText(screen.getByLabelText('The tax rate you want us to use'), '24');
  const op = (useStore.getState() as any).onboardingProfile;
  expect(op.taxMode).toBe('manual');
  expect(op.manualTaxRate).toBe('24');
});

test('clearing it hands the figure back to our estimate', () => {
  set({ ...ESTIMATED, taxMode: 'manual', manualTaxRate: '24' });
  render(<BasePayScreen />);
  fireEvent.changeText(screen.getByLabelText('The tax rate you want us to use'), '');
  expect((useStore.getState() as any).onboardingProfile.taxMode).toBe('system');
});
