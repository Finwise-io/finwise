// G10 (second verification; founder ruling 2026-09-08): at 65+ the HSA card shows the limit only
// with the Medicare condition stated, asks the one question, and drops to $0 once enrolled.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ContributionRoomScreen from '../ContributionRoomScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}) }));

const AGE66 = { status: 'retired', birthYear: String(new Date().getFullYear() - 66), c_401k: '0', c_roth: '0' };

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingProfile: AGE66, onboardingComplete: true } as any);
});

test('at 66 with no answer: the limit shows with the founder\'s condition, and the question is asked', () => {
  render(<ContributionRoomScreen />);
  expect(screen.getByText(/If you are not enrolled in Medicare\. If you are enrolled in Medicare, update it below/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Are you enrolled in Medicare?')).toBeOnTheScreen();
  expect(screen.getByText(/up to \$5,400/)).toBeOnTheScreen();          // 4,400 self-only + 1,000 catch-up
});

test('answering "enrolled" drops the HSA room to $0 and says why; the answer is stored (MK-XS-I-062)', () => {
  render(<ContributionRoomScreen />);
  fireEvent.press(screen.getByLabelText("I'm enrolled in Medicare"));
  expect((useStore.getState() as any).onboardingProfile.medicareEnrolled).toBe('yes');
  expect(screen.getByText(/enrolled in Medicare, so no HSA contribution is allowed/)).toBeOnTheScreen();
  expect(screen.getByText(/up to \$0/)).toBeOnTheScreen();
});

test('under 65 the card is unchanged — no Medicare question', () => {
  useStore.setState({ onboardingProfile: { ...AGE66, birthYear: String(new Date().getFullYear() - 58) } } as any);
  render(<ContributionRoomScreen />);
  expect(screen.queryByLabelText('Are you enrolled in Medicare?')).toBeNull();
});
