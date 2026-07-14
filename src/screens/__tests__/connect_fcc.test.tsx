// Connect flow + unified add-account (design r18-r33, r71-r76) + F1 freshness. Pins: the honest
// consent copy (data flows THROUGH the service's servers — never 'never leaves your device');
// the anti-duplicate merge updates the existing row (same asset_id, history kept), never a twin;
// no provider → the honest not-yet state with the equal doors, never a dead button; the unified
// add screen writes through the same store path with value-as-of stamped; a stale connected
// balance says so on Home.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ConnectFlowScreen from '../ConnectFlowScreen';
import AddAccountScreen from '../AddAccountScreen';
import HomeScreen from '../HomeScreen';
import { useStore } from '../../store/useStore';
import { setSyncProviderForTesting, SandboxSyncProvider, connectionFreshness, CONSENT_COPY } from '../../services/sync';

let mockParams: Record<string, string> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r) }),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  mockParams = {};
  mockPushes.length = 0;
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true } as any);
  setSyncProviderForTesting(new SandboxSyncProvider());
});
afterEach(() => setSyncProviderForTesting(null as any));

const linkThroughChase = async () => {
  render(<ConnectFlowScreen />);
  fireEvent.press(await screen.findByLabelText('Chase. Opens what happens to your data.'));
  fireEvent.press(screen.getByLabelText("Continue to Chase's own sign-in"));
  await waitFor(() => expect(screen.getByText(/Found at Chase/)).toBeTruthy());
};

test('the consent screen carries the APPROVED honest wording — and never the banned phrase', async () => {
  render(<ConnectFlowScreen />);
  fireEvent.press(await screen.findByLabelText('Chase. Opens what happens to your data.'));
  expect(screen.getByText(/flow through the connection service.s servers/)).toBeOnTheScreen();
  expect(screen.getByText(/read-only: nothing and no one can move your money/)).toBeOnTheScreen();
  expect(screen.queryByText(/never leaves your device/)).toBeNull();
  expect(CONSENT_COPY.join(' ')).not.toMatch(/never leaves your device/);
  // manual + import offered AS EQUALS right there (r18)
  expect(screen.getByLabelText('Import a file instead')).toBeOnTheScreen();
  expect(screen.getByLabelText('Add it by hand instead')).toBeOnTheScreen();
});

test('happy path: pick institution → consent → found accounts → tracked with source + last_synced', async () => {
  await linkThroughChase();
  fireEvent.press(screen.getByLabelText(/Track 2 accounts/));
  const accts = (useStore.getState() as any).assetAccounts;
  expect(accts).toHaveLength(2);
  expect(accts.every((a: any) => a.source === 'connected' && a.last_synced)).toBe(true);
  expect(accts.map((a: any) => a.institution)).toEqual(['Chase', 'Chase']);
});

test('the ANTI-DUPLICATE gate (r27): connect-over-existing updates the row — same id, history kept, no twin', async () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'chk1', label: 'My old Chase account', institution: 'chase', kind: 'checking', tax_bucket: 'CASH', balance: 3000, retirement_pct: 50 }],
  } as any);
  await linkThroughChase();
  expect(screen.getByText(/You already track a Chase checking/)).toBeOnTheScreen();   // the merge question
  fireEvent.press(screen.getByLabelText(/Track 2 accounts/));                          // default = update
  const accts = (useStore.getState() as any).assetAccounts;
  expect(accts).toHaveLength(2);                                                       // 1 updated + 1 new, no twin
  const updated = accts.find((a: any) => a.asset_id === 'chk1');
  expect(updated.balance).toBeCloseTo(4211.35);                                        // the connected number
  expect(updated.retirement_pct).toBe(50);                                             // settings KEPT
  expect(updated.source).toBe('connected');
});

test("'add as new — it really is separate' overrides the merge and creates the twin deliberately", async () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'chk1', label: 'Chase joint', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 3000 }],
  } as any);
  await linkThroughChase();
  fireEvent.press(screen.getByLabelText('Add as a new, separate account'));
  fireEvent.press(screen.getByLabelText(/Track 2 accounts/));
  expect((useStore.getState() as any).assetAccounts).toHaveLength(3);
});

test('NO provider (production today): the honest not-yet state + working equal doors — never a dead button', () => {
  setSyncProviderForTesting(null);
  render(<ConnectFlowScreen />);
  expect(screen.getByText(/isn't switched on in this version yet/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Import a file instead'));
  expect(mockPushes).toContain('/import-holdings');
});

test('unified add screen: class-first, dynamic fields, saves with value-as-of stamped today', () => {
  render(<AddAccountScreen />);
  fireEvent.press(screen.getByLabelText('Bonds'));
  fireEvent.changeText(screen.getByLabelText('Account name'), 'Treasury 2034');
  fireEvent.changeText(screen.getByLabelText('Balance'), '9500');
  fireEvent.changeText(screen.getByLabelText('Coupon percent'), '4.5');
  fireEvent.press(screen.getByLabelText('Held in Taxable'));
  fireEvent.press(screen.getByLabelText('Save this account'));
  const a = (useStore.getState() as any).assetAccounts[0];
  expect(a).toMatchObject({ label: 'Treasury 2034', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9500, coupon_rate: 0.045, source: 'manual' });
  expect(a.value_as_of).toBe(new Date().toISOString().slice(0, 10));
});

test('edit mode = manual update (c15): pre-filled; saving updates balance AND re-stamps value-as-of', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'g1', label: 'Gold coins', kind: 'commodities', asset_class: 'alternatives', tax_bucket: 'TAXABLE', balance: 9000, value_as_of: '2025-11-20' }],
  } as any);
  mockParams = { edit: 'g1' };
  render(<AddAccountScreen />);
  expect(screen.getByText('Update Gold coins')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText('Balance'), '10400');
  fireEvent.press(screen.getByLabelText('Save the update'));
  const a = (useStore.getState() as any).assetAccounts[0];
  expect(a.balance).toBe(10400);
  expect(a.value_as_of).toBe(new Date().toISOString().slice(0, 10));   // staleness clock resets together
});

test('debt class writes a real liability through the same store path', () => {
  render(<AddAccountScreen />);
  fireEvent.press(screen.getByLabelText('Debt'));
  fireEvent.changeText(screen.getByLabelText('Account name'), 'Card');
  fireEvent.changeText(screen.getByLabelText('Balance'), '2400');
  fireEvent.changeText(screen.getByLabelText('Interest rate percent'), '22');
  fireEvent.changeText(screen.getByLabelText('Minimum monthly payment'), '80');
  fireEvent.press(screen.getByLabelText('Save this account'));
  const d = (useStore.getState() as any).liabilities[0];
  expect(d).toMatchObject({ label: 'Card', remaining_balance: 2400, interest_rate_apr: 0.22, minimum_monthly_payment: 80 });
});

test('F1 freshness: a connected balance older than 3 days SAYS so on Home', () => {
  const old = new Date(Date.now() - 9 * 86400000).toISOString();
  useStore.setState({
    onboardingProfile: { status: 'employed', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', name: 'Pat' },
    assetAccounts: [{ asset_id: 'c1', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, source: 'connected', last_synced: old }],
  } as any);
  render(<HomeScreen />);
  expect(screen.getByText(/Balances from Chase are 9 days old/)).toBeOnTheScreen();
  expect(connectionFreshness(old)!.stale).toBe(true);
  expect(connectionFreshness(new Date().toISOString())!.stale).toBe(false);
});
