/** Net worth, nothing entered, past the first day (the person chose to add accounts themselves, or was
 *  seeded, and has no account yet) — workplan row 2026-09-14, "the Q48 frame". The approved design for a
 *  nothing-entered Net worth is v08 state C with mark 14 (approved 2026-09-14, DEC-0227): the three ways
 *  to add an account appear ONCE under What you own, and "Add your accounts ›" appears once, on the hero
 *  — never again under each empty group. Debts keeps its own door, "Add your debts ›" (DEC-4528).
 *  The test reads the rendered screen string by string, in order. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import fs from 'fs';
import path from 'path';
import { ruledHtml, ruledLines } from '../../testing/ruledSince';

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
  for (const d of ['Connect your bank', 'Add by hand', 'Import from a file', 'or walk through it step by step']) expect(count(v, d)).toBe(1);
  expect(count(v, 'Add your debts')).toBe(1);                                 // DEC-4528, on Debts — its › sits in the arrow column, as state C draws it
  expect(v[v.indexOf('Add your debts') + 1]).toBe('›');
  expect(count(v, 'Nothing entered yet.')).toBe(3);                           // hero · the ways-to-add line · Debts
  // order: hero door → What you own → the ways to add → Debts and its door
  const at = (s: string) => v.indexOf(s);
  expect(at('Add your accounts ›')).toBeLessThan(at('WHAT YOU OWN'));
  expect(at('WHAT YOU OWN')).toBeLessThan(at('How do you want to add an account?'));
  expect(at('or walk through it step by step')).toBeLessThan(at('DEBTS'));
  expect(at('DEBTS')).toBeLessThan(at('Add your debts'));
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

// ── THE WHOLE OF STATE C, word for word and in order ────────────────────────────────────────────────
// The spec is read from the approved drawing itself, not typed here: every visible string of the state C
// phone, minus what the screen does not draw (status bar and app header above it, tab bar below it) and the
// drawing's numbered change marks. Two later rulings are applied on top, as the drawing's READ THIS FIRST
// rows say: DEC-4528 (the debts door reads "Add your debts"); and his ruling 'all', 2026-11-06 (ruledSince: the
// connect door's words, the section emoji gone, no first-day retirement card on Net worth). Band titles are drawn upper-case by the
// drawing's own style (text-transform), and its info dot "i" is the app's "ⓘ".
const MOCK = path.join(__dirname, '../../../MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html');
const stateC = (): string[] => {
  const html = ruledHtml(MOCK, fs.readFileSync(MOCK, 'utf8'));
  const start = html.indexOf('<!-- ══════════ STATE C — first day ══════════ -->');
  const end = html.indexOf('<p class="cap"><b>STATE C — first day.</b>');
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  const txt = html.slice(start, end).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8250;|&rsaquo;/g, '›').replace(/&minus;/g, '−');
  let lines = txt.split('\n').map((l) => l.trim()).filter(Boolean);
  lines = lines.slice(lines.indexOf('⚙') + 1);                                   // status bar + app header
  lines = lines.slice(0, lines.lastIndexOf('Home'));                              // tab bar
  return ruledLines(MOCK, lines).filter((l) => !/^\d+$/.test(l))                                    // the drawing's change marks
    .map((l) => (l === 'Add a mortgage, card, or loan' ? 'Add your debts' : l));  // DEC-4528
};
const norm = (v: string[]) => v.map((l) => (l === 'i' ? 'ⓘ' : l)).join(' ').replace(/\s+/g, ' ').toUpperCase();

test.each([['first day', null], ['past the first day', 'self']])('nothing entered (%s): the screen is v08 state C, every string in order', (_l, choice) => {
  useStore.setState({ nwSeeded: choice != null, nwSetupChoice: choice } as any);
  render(<NetWorth />);
  const spec = stateC();
  expect(spec.length).toBeGreaterThanOrEqual(30);                                 // the reader saw the whole phone
  expect(norm(visible())).toBe(norm(spec));
  expect(visible()).not.toContain('＋ Add an account');                            // state C does not draw it
});

test('past the first day, By institution: the same state C, with the institution line in place of the groups', () => {
  render(<NetWorth />);
  fireEvent.press(screen.getByLabelText(/^Group what you own by institution/));
  const v = visible();
  expect(v).toContain('Your banks and brokerages will be listed here, each with what it holds.');
  expect(v).not.toContain('CASH');
  expect(v).not.toContain('＋ Add an account');
});

// ── THE RETIREMENT ASK SAYS WHAT IS STILL MISSING (DEC-0086) ─────────────────────────────────────────
// Nothing entered means "what you have" is always missing. Before 2026-11-06 Net worth carried the sample
// card here with the missing answers named; his ruling 'all', 2026-11-06, took that card off Net worth with
// no accounts (Home and Plan keep their sample). So on Net worth, whatever answers are given, no card and no line.
test.each([
  ['3 missing', {}],
  ['2 missing (age given)', { birthYear: 1975 }],
  ['1 missing (age and spending given)', { birthYear: 1975, monthlySpending: '4500' }],
])('nothing entered, %s: no retirement sample card on Net worth', (_l, answers) => {
  for (const choice of [null, 'self']) {
    useStore.setState({ nwSeeded: choice != null, nwSetupChoice: choice, onboardingProfile: { status: 'employed', ...answers } } as any);
    render(<NetWorth />);
    const v = visible();
    expect(v.length).toBeGreaterThanOrEqual(20);                                  // the guard saw the whole screen
    // his ruling 'all', 2026-11-06: no first-day sample card on Net worth
    expect(screen.queryByText(/^YOUR RETIREMENT PLAN$/i)).toBeNull();
    expect(v.findIndex((s) => s.startsWith('Sample:'))).toBe(-1);
    expect(v.filter((s) => /answers? make it yours|it becomes yours/.test(s))).toHaveLength(0);
    screen.unmount();
  }
});
