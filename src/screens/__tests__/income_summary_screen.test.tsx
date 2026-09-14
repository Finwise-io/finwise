/**
 * YOUR INCOME — the summary, against the approved mock income-v5, frames 5a and 5b.
 *
 * TWO TOTALS, NEVER ONE. What lands is what you can spend; what you are taxed on is a different
 * number and says so. Mixing them is how a take-home figure comes to include a bonus nobody has been
 * paid yet — and how interest and dividends came to be counted as spendable when they are reinvested
 * where they are earned and never reach the bank.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import { useStore } from '../../store/useStore';

const set = (op: any) => useStore.setState({ onboardingProfile: op, onboardingComplete: true } as any);
const HOUSE: any = {
  baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000',
  hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
  partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
  invAnnual: '3000', bonusAnnual: '12000',
};

test('5a — two totals, each named', () => {
  set(HOUSE);
  render(<IncomeSummaryScreen />);
  expect(screen.getByText('Take-home each month')).toBeOnTheScreen();
  expect(screen.getByText('What it is taxed on')).toBeOnTheScreen();
  expect(screen.getByText('= Income (take-home), a usual month')).toBeOnTheScreen();
  expect(screen.getByText('= Gross /year')).toBeOnTheScreen();
});

test('5a — a section per earner in what lands, and per source in what is taxed', () => {
  set(HOUSE);
  render(<IncomeSummaryScreen />);
  expect(screen.getByText('Your pay')).toBeOnTheScreen();
  expect(screen.getByText('Sam’s pay')).toBeOnTheScreen();
  expect(screen.getByText('Your gross')).toBeOnTheScreen();
  expect(screen.getByText('Sam’s gross')).toBeOnTheScreen();
  expect(screen.getByText('Interest & dividends')).toBeOnTheScreen();
  expect(screen.getByText('Bonus')).toBeOnTheScreen();
});

test('THE LAW: dividends are in what is taxed, and NOT in what lands — and the screen says why', () => {
  set(HOUSE);
  render(<IncomeSummaryScreen />);
  expect(screen.getByText(/reinvested where it is earned and never reaches your bank/)).toBeOnTheScreen();
  expect(screen.getByText(/It is taxed, so it appears below/)).toBeOnTheScreen();
});

test('a recap SHOWS the rate and points at the one place it is set — it never asks', () => {
  set({ ...HOUSE, taxMode: 'manual', manualTaxRate: '24' });
  render(<IncomeSummaryScreen />);
  expect(screen.getByText('Tax')).toBeOnTheScreen();
  expect(screen.getByText(/your rate, 24% \(edit on Your base pay screen\)/)).toBeOnTheScreen();
  expect(screen.queryByLabelText('The tax rate you want us to use')).toBeNull();   // no field here
});

test('without a rate of their own it says the bracket and what the estimate assumed', () => {
  set({ baseSalary: '7000', salaryFreq: 'monthly' });
  render(<IncomeSummaryScreen />);
  expect(screen.getByText('Federal tax bracket')).toBeOnTheScreen();
  expect(screen.getByText('Calculated federal tax')).toBeOnTheScreen();
  expect(screen.getByText('assumes you take the standard deduction')).toBeOnTheScreen();
});

test('5b — a fresh account keeps both headings and shows $0 with the one line (Q48, 2026-09-12 — a dash was the old form)', () => {
  set({});
  render(<IncomeSummaryScreen />);
  expect(screen.getByText('Take-home each month')).toBeOnTheScreen();
  expect(screen.getByText('What it is taxed on')).toBeOnTheScreen();
  expect(screen.queryByText('—')).toBeNull();
  expect(screen.getAllByText('$0')).toHaveLength(2);
  expect(screen.getAllByText(/^Nothing entered yet\./).length).toBe(2);
  expect(screen.getByLabelText('Add your income')).toBeOnTheScreen();
});
