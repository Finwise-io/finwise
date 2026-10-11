/**
 * ADD THE PROPERTY FIRST AT SIGN-UP (DEC-4350, 2026-10-11, his words "A - approved.").
 * Sign-up takes no property, so with none held the rent step shows "Add the property first ›". It opens Add an account
 * on Real estate, pushed on top of the rent step. Saving brings the person back to the same rent step with the rent
 * they typed, where "Which property is it?" now shows (DEC-4327); one tap picks it and the rent counts at once.
 * Cancelling comes back unchanged.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import OnboardingScreen from '../OnboardingScreen';
import AddAccountScreen from '../AddAccountScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import { nextRoute } from '../../navigation/routeGuard';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams, router: { push: (...a: any[]) => mockPush(...a), back: () => mockBack() },
}));

// The app's stack: Add an account is pushed ON TOP of the rent step, which stays mounted underneath.
const Stack = ({ top }: { top: boolean }) => (<><OnboardingScreen />{top && <AddAccountScreen />}</>);

// steps: status · goals · whatYouNeed · income_sources · income_rental (index 4)
const atRentStep = () => {
  mockPush.mockClear(); mockBack.mockClear(); mockParams = {};
  useStore.getState().resetAll();
  useStore.setState({
    user: { uid: 't', email: 't@t.com', name: 'T' }, onboardingComplete: false, assetAccounts: [],
    onboardingDraft: { stepIndex: 4, status: 'employed', tracks: ['spend'], name: 'T',
      answers: { incomeSources: ['rental'], rentals: [{ type: 'long', income: '1800', expenses: '600' }] } },
  } as any);
  return render(<Stack top={false} />);
};
const savedRent = () => (useStore.getState().onboardingDraft as any).answers.rentals[0];
const openAddAccount = (onb: ReturnType<typeof render>) => {
  fireEvent.press(onb.getByLabelText('Add the property first'));
  expect(mockPush).toHaveBeenCalledWith('/add-account?cls=property&from=onboarding');
  mockParams = { cls: 'property', from: 'onboarding' };
  onb.rerender(<Stack top />);
  return onb;
};
const closeAddAccount = (onb: ReturnType<typeof render>) => onb.rerender(<Stack top={false} />);

test('no property held — the rent step shows the door, and no question yet', () => {
  const onb = atRentStep();
  expect(onb.getByText('Rental property')).toBeOnTheScreen();
  expect(onb.getByText('Add the property first ›')).toBeOnTheScreen();
  expect(onb.queryByText('Which property is it?')).toBeNull();
});

test('the door opens Add an account on Real estate, and the route guard lets it open mid-setup', () => {
  const onb = atRentStep();
  const add = openAddAccount(onb);
  expect(add.getByText('Add an account')).toBeOnTheScreen();
  expect(add.getByLabelText('Real estate').props.accessibilityState.selected).toBe(true);
  expect(nextRoute({ user: true, onboardingComplete: false, onboardingPaused: false, segment: 'add-account' })).toBeNull();
});

test('save a property → back on the rent step, rent kept, question shown; one tap picks it and the rent counts', () => {
  const onb = atRentStep();
  const add = openAddAccount(onb);
  fireEvent.changeText(add.getByLabelText('Account name'), 'Lake house');
  fireEvent.changeText(add.getByLabelText('Balance'), '400000');
  fireEvent.press(add.getByLabelText('Save this account'));
  expect(mockBack).toHaveBeenCalled();
  closeAddAccount(add);
  // setup is half-answered: Net worth is NOT marked seeded by a property added from the rent step
  expect((useStore.getState() as any).nwSeeded).toBeFalsy();

  // back on the same rent step, the typed rent kept, the question now shown
  expect(onb.getByText('Rental property')).toBeOnTheScreen();
  expect(onb.getByDisplayValue('1800')).toBeOnTheScreen();
  expect(onb.getByDisplayValue('600')).toBeOnTheScreen();
  expect(onb.getByText('Which property is it?')).toBeOnTheScreen();
  expect(onb.queryByText('Add the property first ›')).toBeNull();

  const lake = (useStore.getState() as any).assetAccounts.find((a: any) => a.label === 'Lake house');
  fireEvent.press(onb.getByLabelText('Property 1 is Lake house'));
  expect(savedRent().property_id).toBe(String(lake.asset_id));
  expect(savedRent().income).toBe('1800');

  const answers = (useStore.getState().onboardingDraft as any).answers;
  onb.unmount();
  useStore.setState({ onboardingProfile: answers, onboardingComplete: true, hideBalances: false } as any);
  render(<IncomeManagerScreen />);
  expect(screen.getByText('One property · $1,200/month net')).toBeOnTheScreen();
});

test('cancel Add an account → back on the rent step unchanged', () => {
  const onb = atRentStep();
  const before = JSON.stringify((useStore.getState().onboardingDraft as any).answers);
  const add = openAddAccount(onb);
  fireEvent.press(add.getByLabelText('Back'));
  expect(mockBack).toHaveBeenCalled();
  closeAddAccount(add);
  expect((useStore.getState() as any).assetAccounts).toHaveLength(0);
  expect(JSON.stringify((useStore.getState().onboardingDraft as any).answers)).toBe(before);
  expect(onb.getByText('Rental property')).toBeOnTheScreen();
  expect(onb.getByDisplayValue('1800')).toBeOnTheScreen();
  expect(onb.getByText('Add the property first ›')).toBeOnTheScreen();
  expect(onb.queryByText('Which property is it?')).toBeNull();
});
