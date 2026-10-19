/** Q48 — the empty state, one pattern (founder ruling 2026-09-09; mock approved 2026-09-12):
 *  a figure with nothing behind it shows $0, then one line — "Nothing entered yet." — and the door to
 *  the thing to add. A real zero that was entered shows a plain $0 with no line. The mock's screen is
 *  Net worth; this test reads the built screen the way the mock is read, string by string. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));

const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const visible = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; } (n.children ?? []).forEach(walk); };
  walk(screen.toJSON()); return out;
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', onboardingProfile: { status: 'employed' }, assetAccounts: [], liabilities: [] } as any);
});

test('frame 1 — nothing entered: $0 and the one line under the hero, the ways to add ONCE, and DEBTS', () => {
  // Net worth v08 state C and mark 14 (approved 2026-09-14, DEC-0227) replace the Q48 drawing's frame 1
  // here: "Add your accounts ›" no longer repeats under Cash and Investments — "too much duplication".
  // The whole screen is held to state C word for word by nw_no_accounts_one_door.test.tsx.
  render(<NetWorth />);
  const v = visible();
  expect(v.filter((s) => s === 'Nothing entered yet.').length).toBe(3);   // hero + the ways-to-add line + Debts
  expect(v.filter((s) => s === 'Add your accounts ›').length).toBe(1);   // the hero's, once
  expect(v.filter((s) => s === 'Add your debts').length).toBe(1);       // DEC-4528, its › in the arrow column (v08 state C)
  expect(screen.queryByText(/No debts — it's all yours/)).toBeNull();
  expect(screen.queryByText(/one live number/)).toBeNull();
  // the line reads as one sentence to VoiceOver
  expect(screen.getAllByLabelText('Nothing entered yet. Add your accounts ›').length).toBe(1);
});

test('frame 2 — cash entered, nothing else: Cash is plain, Investments shows $0 with the line, Debts shows the line', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12400, target_return: 0.01 }] } as any);
  render(<NetWorth />);
  const v = visible();
  const iInv = v.findIndex((s) => /Investments/.test(s));
  expect(iInv).toBeGreaterThan(-1);
  expect(v.slice(iInv, iInv + 6)).toContain('Nothing entered yet.');       // the line sits under the empty group
  expect(v.slice(iInv, iInv + 6)).toContain('Add your accounts ›');
  const iCash = v.findIndex((s) => /Cash/.test(s));
  expect(v.slice(iCash + 1, iInv)).not.toContain('Nothing entered yet.');   // a real figure needs no line
  expect(screen.getAllByText('Add your debts ›').length).toBeGreaterThanOrEqual(1);
});

test('a real zero that was entered is a plain $0 — no line under it', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'chk', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 0, target_return: 0 }] } as any);
  render(<NetWorth />);
  const v = visible();
  // the empty Investments group and Debts carry their lines; the entered-zero Cash account adds none, and the hero has a real (zero) figure
  expect(v.filter((s) => s === 'Nothing entered yet.').length).toBe(2);
  const iCash = v.findIndex((s) => /Cash/.test(s)), iInv = v.findIndex((s) => /Investments/.test(s));
  expect(iCash).toBeGreaterThan(-1);
  expect(v.slice(iCash, iInv)).not.toContain('Nothing entered yet.');
});
