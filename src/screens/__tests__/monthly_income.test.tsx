// Monthly income screen (FCC Phase 2) — the retiree's front door. Pins the contract with the F5
// paycheck engine: saved fields land as ri_*, annual/quarterly rhythms carry their landing month,
// and saving any amount OPENS the received-now gate (incomeSources) — without it the engine sees
// nothing (the B-31 lesson).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MonthlyIncomeScreen from '../MonthlyIncomeScreen';
import { useStore } from '../../store/useStore';
import { guaranteedRows } from '../../domain/paycheck';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }) }));

beforeEach(() => {
  mockBack.mockClear();
  useStore.setState({ onboardingProfile: { status: 'retired', incomeSources: [] } } as any);
});

describe('MonthlyIncomeScreen', () => {
  it('saves Social Security + annual pension with its landing month, and OPENS the income-sources gate', () => {
    render(<MonthlyIncomeScreen />);
    fireEvent.changeText(screen.getByLabelText('Social Security amount each month'), '2600');
    fireEvent.changeText(screen.getByLabelText('day of month Social Security arrives'), '3');
    fireEvent.changeText(screen.getByLabelText('pension amount'), '19200');
    fireEvent.press(screen.getByLabelText('pension paid annual'));
    fireEvent.press(screen.getAllByLabelText('lands in Dec')[0]);
    fireEvent.press(screen.getByLabelText('Save monthly income'));

    const op = (useStore.getState() as any).onboardingProfile;
    expect(op.ri_ss).toBe('2600');
    expect(op.ri_ss_day).toBe(3);
    expect(op.ri_pension).toBe('19200');
    expect(op.ri_pension_freq).toBe('annual');
    expect(op.ri_pension_month).toBe(12);
    expect(op.incomeSources).toContain('retirement_income');   // the gate is OPEN
    expect(mockBack).toHaveBeenCalled();

    // end-to-end: the F5 engine actually sees what this screen saved
    const rows = guaranteedRows(op, new Date('2026-07-15T12:00:00'));
    expect(rows.filter((r) => r.source === 'Social Security')).toHaveLength(12);
    expect(rows.find((r) => r.source === 'Pension')).toMatchObject({ amount: 19200, month: 12 });
  });

  it("'Not yet' hides the Social Security amount and offers the claim-decision path", () => {
    render(<MonthlyIncomeScreen />);
    fireEvent.press(screen.getByText('Not yet'));
    expect(screen.queryByLabelText('Social Security amount each month')).toBeNull();
    expect(screen.getByText(/Deciding when to claim/)).toBeOnTheScreen();
  });

  it('shows the running guaranteed total as amounts are typed (monthly equivalent)', () => {
    render(<MonthlyIncomeScreen />);
    fireEvent.changeText(screen.getByLabelText('Social Security amount each month'), '2600');
    fireEvent.changeText(screen.getByLabelText('pension amount'), '1600');
    expect(screen.getByLabelText(/guaranteed income .?4,200 a month/)).toBeOnTheScreen();
  });

  it('saving with everything empty does NOT open the gate (no phantom retirement income)', () => {
    render(<MonthlyIncomeScreen />);
    fireEvent.press(screen.getByText('Not yet'));
    fireEvent.press(screen.getByLabelText('Save monthly income'));
    const op = (useStore.getState() as any).onboardingProfile;
    expect(op.incomeSources ?? []).not.toContain('retirement_income');
  });
});
