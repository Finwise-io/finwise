// Job-safety REBUILD (founder-approved mock, 2026-07-17) — pins: calm word cards (no smiley
// radios), answers persist on tap (no Save button), the gap is the hero with its math in one
// sentence, NO silent $2,500 default (the screen asks), and the gap can be saved as a goal.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import JobSafetyScreen from '../JobSafetyScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => { useStore.getState().resetAll(); });

test('calm word cards — the smiley radios are gone; picking one persists immediately (no Save button)', () => {
  render(<JobSafetyScreen />);
  expect(screen.getByText(/Very stable/)).toBeOnTheScreen();
  expect(screen.getByText(/Some uncertainty/)).toBeOnTheScreen();
  expect(screen.getByText(/Worried/)).toBeOnTheScreen();
  expect(screen.queryByText(/😊|😐|😟/)).toBeNull();                       // no smileys
  expect(screen.queryByText(/Plan saved/)).toBeNull();                     // no chatty save flow
  fireEvent.press(screen.getByText(/Some uncertainty/));
  expect((useStore.getState() as any).jobRiskLevel).toBe('medium');        // persisted on tap
  expect(screen.getByText(/✓ Some uncertainty/)).toBeOnTheScreen();        // word + weight, never tint alone
});

test('no silent default: with nothing logged the screen ASKS for essential bills — $2,500 never appears', () => {
  render(<JobSafetyScreen />);
  expect(screen.getByText(/What do your essential bills come to/)).toBeOnTheScreen();
  expect(screen.queryByText(/\$2,500/)).toBeNull();
});

test('the gap is the hero with its math in one sentence; months persist on tap', () => {
  useStore.setState({ savings: [{ id: 's1', amount: 8400, date: '2026-07-01' }] } as any);
  render(<JobSafetyScreen />);
  fireEvent.changeText(screen.getByLabelText('Essential monthly bills'), '2800');
  // 6 months default: target 16,800 − 8,400 savings = 8,400 gap
  expect(screen.getByText('$8,400')).toBeOnTheScreen();
  expect(screen.getByText(/6 months of essentials is \$16,800 \(\$2,800\/mo\)/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('3 months of cushion'));
  expect((useStore.getState() as any).emergencyMonths).toBe(3);
  expect(screen.getByText('✓ Covered')).toBeOnTheScreen();                 // 3mo target 8,400 = covered
});

test('the example pace is LABELED and the gap saves as a real goal', () => {
  useStore.setState({ savings: [{ id: 's1', amount: 2400, date: '2026-07-01' }] } as any);
  render(<JobSafetyScreen />);
  fireEvent.changeText(screen.getByLabelText('Essential monthly bills'), '2800');
  expect(screen.getByText(/an example pace, set your own/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Save the cushion as a goal'));
  const goals = (useStore.getState() as any).goals;
  expect(goals.some((g: any) => g.label === 'Emergency fund')).toBe(true);
});
