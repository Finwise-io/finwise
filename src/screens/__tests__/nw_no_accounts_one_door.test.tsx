/** Net worth, nothing entered, past the first day (the person chose to add accounts themselves, or was
 *  seeded, and has no account yet) — workplan row 2026-09-14, "the Q48 frame". The approved design for a
 *  nothing-entered Net worth is v08 state C with mark 14 (approved 2026-09-14, DEC-0227): the three ways
 *  to add an account appear ONCE under What you own, and "Add your accounts ›" appears once, on the hero
 *  — never again under each empty group. Debts keeps its own door, "Add your debts ›" (DEC-4528).
 *  The test reads the rendered screen string by string, in order. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
  const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; } if (Array.isArray(n)) { n.forEach(walk); return; } (n.children ?? []).forEach(walk); };
  walk(screen.toJSON()); return out;
};
const count = (v: string[], s: string) => v.filter((x) => x === s).length;

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', onboardingProfile: { status: 'employed' }, assetAccounts: [], liabilities: [] } as any);
});

test.each([['By category'], ['By institution']])('nothing entered, past the first day (%s): ONE door to add an account, the ways to add once', (pill) => {
  render(<NetWorth />);
  fireEvent.press(screen.getByLabelText(new RegExp(`^Group what you own ${pill.toLowerCase()}`)));
  expect(screen.getByLabelText(`Group what you own ${pill.toLowerCase()}, selected`)).toBeTruthy();
  const v = visible();
  expect(v.length).toBeGreaterThanOrEqual(20);                               // the guard saw the whole screen
  expect(count(v, 'Add your accounts ›')).toBe(1);                            // the hero's, and nowhere else
  expect(count(v, 'How do you want to add an account?')).toBe(1);
  for (const d of ['Link it (read-only)', 'Add by hand', 'Import from a file', 'or walk through it step by step']) expect(count(v, d)).toBe(1);
  expect(count(v, 'Add your debts ›')).toBe(1);                               // DEC-4528, on Debts
  expect(count(v, 'Nothing entered yet.')).toBe(3);                           // hero · the ways-to-add line · Debts
  // order: hero door → What you own → the ways to add → Debts and its door
  const at = (s: string) => v.indexOf(s);
  expect(at('Add your accounts ›')).toBeLessThan(at('WHAT YOU OWN'));
  expect(at('WHAT YOU OWN')).toBeLessThan(at('How do you want to add an account?'));
  expect(at('or walk through it step by step')).toBeLessThan(at('DEBTS'));
  expect(at('DEBTS')).toBeLessThan(at('Add your debts ›'));
});

test('the same screen and words as the first day where they meet: the ways to add are one block in both', () => {
  render(<NetWorth />);
  const later = visible();
  const block = (v: string[]) => v.slice(v.indexOf('How do you want to add an account?') - 1, v.indexOf('DEBTS'));
  screen.unmount();
  useStore.setState({ nwSeeded: false, nwSetupChoice: null } as any);
  render(<NetWorth />);
  const first = visible();
  expect(block(later)).toEqual(block(first));
  expect(count(first, 'Add your accounts ›')).toBe(1);
});

test('one empty group beside an entered one keeps its own line and door (Q48 frame 2) — that is one door, not a repeat', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12400, target_return: 0.01 }] } as any);
  render(<NetWorth />);
  const v = visible();
  expect(count(v, 'Add your accounts ›')).toBe(1);
  expect(count(v, 'How do you want to add an account?')).toBe(0);
});
