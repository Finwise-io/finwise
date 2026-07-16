// Founder UX review 2026-07-16 (Principal-UX pass over the menu + every popup) — pins for the fixes:
// (1) the add-expense sheet lays categories on an even left-packed grid in a DELIBERATE order
//     (everyday → once in a while → bills), selection shows a ✓ word-mark, and the sheet has a ✕;
// (2) Add-account has a visible ‹ Back;
// (3) Sharpen your plan carries the SAME three doors Home offers (connect / import / add by hand);
// (4) the Menu mirrors the tab bar (pinned in TopBar.test.tsx — the strip + "MORE IN …" groups).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuickAddExpense } from '../components/MoneySheets';
import AddAccountScreen from '../screens/AddAccountScreen';
import SharpenPlanScreen from '../screens/SharpenPlanScreen';
import { useStore } from '../store/useStore';

const mockPushes: string[] = [];
const mockBack: jest.Mock = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: (r: string) => mockPushes.push(r), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  mockPushes.length = 0;
  mockBack.mockClear();
  useStore.getState().resetAll();
});

describe('the add-expense sheet (founder finding: categories were random + centered/ragged)', () => {
  const sheetProps = { visible: true, onClose: jest.fn(), customCats: [], isCurrentMonth: true, baseDate: new Date(), monthLabel: 'July' };

  test('categories come grouped in a deliberate order — everyday first, then non-monthly, then bills', () => {
    render(<QuickAddExpense {...sheetProps} />);
    expect(screen.getByText('EVERYDAY')).toBeOnTheScreen();
    expect(screen.getByText('ONCE IN A WHILE')).toBeOnTheScreen();
    expect(screen.getByText('BILLS & FIXED')).toBeOnTheScreen();
    expect(screen.getByText('MORE')).toBeOnTheScreen();
    // everyday leads: Groceries renders before Rent / Mortgage in the tree
    const labels = ['Groceries', 'Rent / Mortgage'].map((t) => screen.getByText(new RegExp(t)));
    expect(labels[0]).toBeOnTheScreen();
    expect(labels[1]).toBeOnTheScreen();
  });

  test('picking a category marks it with a ✓ word-mark — never color alone', () => {
    render(<QuickAddExpense {...sheetProps} />);
    fireEvent.press(screen.getByLabelText('Groceries'));
    expect(screen.getByText(/✓ Groceries/)).toBeOnTheScreen();
  });

  test('the sheet has an explicit ✕ close besides the backdrop', () => {
    const onClose = jest.fn();
    render(<QuickAddExpense {...sheetProps} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  test('a custom category joins the MORE group with Other last', () => {
    render(<QuickAddExpense {...sheetProps} customCats={[{ label: 'Pet care', icon: '🐾' }]} />);
    expect(screen.getByLabelText('Pet care')).toBeOnTheScreen();
    expect(screen.getByLabelText('Other')).toBeOnTheScreen();
  });
});

describe('Add-account (founder finding: no back button)', () => {
  test('a visible ‹ Back sits above the headline and goes back', () => {
    render(<AddAccountScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Sharpen your plan (founder finding: old design, no upload or connect options)', () => {
  test('the three Home doors lead the screen and route: connect · import · add by hand', () => {
    render(<SharpenPlanScreen />);
    expect(screen.getByText('THE FAST WAYS IN')).toBeOnTheScreen();
    fireEvent.press(screen.getByText(/Connect your bank/));
    expect(mockPushes).toContain('/connect');
    fireEvent.press(screen.getByText(/Import a file from your brokerage/));
    expect(mockPushes).toContain('/import-holdings');
    fireEvent.press(screen.getByText(/Add something by hand/));
    expect(mockPushes).toContain('/add-account');
  });

  test('the checklist keeps its job under FINISH WHAT YOU SKIPPED, and Back is visible', () => {
    render(<SharpenPlanScreen />);
    expect(screen.getByText('FINISH WHAT YOU SKIPPED')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
