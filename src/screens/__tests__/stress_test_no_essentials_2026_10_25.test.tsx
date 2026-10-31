/** THE STRESS TEST WITH NO ESSENTIALS: NO MONTHS AND NO TARGET, NEVER "0.0 MONTHS" OR "A STRONG FUND" (2026-10-25, FIX-BUDGET).
 *
 *  The outside audit (OpenAI, 2026-10-24), MK-CF-F-010: an undefined ratio must not appear as zero with a favourable status.
 *  With $6,000 of cash, nothing logged and no budget, the Stress test read "You'd have $3,000 left — about 0.0 months of
 *  essentials ($0/month — )." over "✓ You already have at least 3 months of essentials set aside. A strong emergency fund" —
 *  cash ÷ $0, and a $0 target called covered. emergencyTest (MK-CF-F-010) now gives no months and no target with $0 of
 *  essentials, as its door MK-NW-O-004 theEmergencyFund already did, and the screen keeps the null.
 *
 *  Held to the drawing it was built from, MoneyKeel/documents/other/moneykeel_pres_mock_stresstest-mock_v02.html (drawn first,
 *  its READ THIS FIRST row dated 2026-10-25): phone A (with essentials, unchanged) and phone B (no essentials, the change) —
 *  every rendered line, in order, is on the drawn phone. And the function, its door and the screen give one answer (tenet 4).
 *
 *  SINCE 2026-10-27 (FX-CF-C, DEC-8839) the screen is built to v03, and src/screens/__tests__/stress_test_drawing_v03.test.tsx holds
 *  it word for word, both ways. v02 is archived; its two phone matches are kept below as test.failing (the old answer, never deleted).
 *  The words of phone B's change stand in v03 unchanged, with ’ for the apostrophe.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { emergencyTest } from '../../domain/budget';
import { theEmergencyFund } from '../../../MoneyKeel/functions/networth-and-performance/emergency-fund';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() },
}));

const ROOT = path.join(__dirname, '..', '..', '..');
const MOCK = 'MoneyKeel/documents/other/archive/2026-10-27_moneykeel_pres_mock_stresstest-mock_v02.html';   // archived 2026-10-27; v03 is the design

const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
function lines(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
/** the drawn phones, as words, in order — each `class="phone"` block, tags stripped */
function phones(): string[] {
  const html = fs.readFileSync(path.join(ROOT, MOCK), 'utf8');
  return html.split('<div class="phone">').slice(1).map((b) => b.split('<div class="cap">')[0]
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim());
}
const checking = (balance: number) => ({ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance, asset_class: 'cash' });
const shoot = (extra: any): string[] => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', birthYear: '1971' }, assetAccounts: [], liabilities: [], expenses: [], incomes: [], ...extra } as any);
  const C = require('../StressTestScreen').default;
  const r = render(<C />);
  const l = lines();
  r.unmount();
  return l;
};
const PHONE_A = { assetAccounts: [checking(18000)], onboardingProfile: { status: 'employed', birthYear: '1971', monthlySpending: '3470' } };
const PHONE_B = { assetAccounts: [checking(6000)] };
/** every rendered line appears on the drawn phone, in the order rendered */
const onPhoneInOrder = (rendered: string[], drawn: string) => {
  let from = 0;
  const missing: string[] = [];
  for (const l of rendered) { const at = drawn.indexOf(l, from); if (at < 0) missing.push(l); else from = at + l.length; }
  expect(missing).toEqual([]);
  expect(rendered.length).toBeGreaterThanOrEqual(12);   // a guard proves it looked: the whole screen, not a card
};

describe('the Stress test with $0 of essentials (MK-CF-F-010, MK-MN-M-025)', () => {
  test('phone B, as drawn: "$3,000 left. With $0/month of essentials there is no count of months to state." and "No target yet"', () => {
    const l = shoot(PHONE_B);
    expect(l).toContain('✓ You could cover a $3,000 hit');
    expect(l).toContain('You’d have $3,000 left. With $0/month of essentials there is no count of months to state.');
    expect(l).toContain('No target yet: your essentials come to $0/month.');
    // never a 0 that reads as an answer, never a verdict on nothing
    expect(l.join(' | ')).not.toMatch(/0\.0 months/);
    expect(l.join(' | ')).not.toMatch(/already have at least 3 months|strong emergency fund/i);
  });
  test.failing('phone B, the screen until 2026-10-27, pinned: every line on v02\'s phone B in order — no longer its design (v03 since 2026-10-27, DEC-8839)', () => {
    onPhoneInOrder(shoot(PHONE_B), phones()[1]);
  });
  test('phone A, as drawn and unchanged: $18,000, a $3,000 hit, $3,470/month → $15,000 left, 4.3 months; 5.2 months; no gap', () => {
    const l = shoot(PHONE_A);
    expect(l).toContain('You’d have $15,000 left — about 4.3 months of essentials ($3,470/month — you entered).');   // 15,000 ÷ 3,470 = 4.32
    expect(l).toContain('5.2 months');                                                                            // 18,000 ÷ 3,470 = 5.19 (v03: the months as Net worth writes them)
    expect(l).toContain('✓ You already have at least 3 months of essentials set aside. A strong emergency fund — some stretch toward 6 months — your call.');   // 3 × 3,470 = 10,410 ≤ 18,000
  });
  test.failing('phone A, the screen until 2026-10-27, pinned: every line on v02\'s phone A in order — no longer its design (v03 since 2026-10-27, DEC-8839)', () => {
    onPhoneInOrder(shoot(PHONE_A), phones()[0]);
  });
  test('the archived v02 drawing holds two phones and its READ THIS FIRST row is dated 2026-10-25', () => {
    expect(phones()).toHaveLength(2);
    expect(fs.readFileSync(path.join(ROOT, MOCK), 'utf8')).toMatch(/READ THIS FIRST — 2026-10-25/);
  });
});

describe('one answer on the function, its door and the screen (tenet 4)', () => {
  test('$6,000, a $3,000 hit, $0 essentials: emergencyTest and theEmergencyFund both give no months and no target; the hit is covered on both', () => {
    const t = emergencyTest(null, 6000, 3000, 0);
    const door = theEmergencyFund({ accounts: [checking(6000)] as any, expenses: [], profile: {}, debts: [] });
    expect([t.runwayAfter, t.jobLossRunway, t.recommendedFund, t.gapToFund]).toEqual([null, null, null, null]);
    expect([door.afterAShock(3000).monthsAfter, door.monthsCovered, door.targetFor(3)]).toEqual([null, null, null]);
    expect([t.cashAfter, t.coversIt]).toEqual([3000, true]);
    expect([door.afterAShock(3000).cashAfter, door.afterAShock(3000).coversIt]).toEqual([3000, true]);
  });
  test('with essentials the two agree to the cent: $18,000, $3,000 hit, $3,470/month → 4.3227… months after, 5.1873… before, $10,410 target', () => {
    const op: any = { monthlySpending: '3470' };
    const t = emergencyTest(op, 18000, 3000, 3470);
    const door = theEmergencyFund({ accounts: [checking(18000)] as any, expenses: [], profile: op, debts: [] });
    expect(t.runwayAfter).toBeCloseTo(15000 / 3470, 9);
    expect(door.afterAShock(3000).monthsAfter).toBeCloseTo(t.runwayAfter as number, 9);
    expect(door.monthsCovered).toBeCloseTo(t.jobLossRunway as number, 9);
    expect(door.targetFor(3)!.target).toBeCloseTo(t.recommendedFund as number, 9);
    expect(t.gapToFund).toBe(0);
  });
});
