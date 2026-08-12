// THE OUTCOME BLOCK — one score, then arithmetic (founder 2026-08-12).
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlanOutcome } from '../PlanOutcome';
import { useStore } from '../../store/useStore';
import type { RetirementInputs } from '../../domain/retirement';

const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90,
  start_balance: 909_152, annual_contribution: 0, retire_monthly_spend_today: 5_200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  inflation: 0.025, mean_return: 0.077, vol_return: 0.11, paths: 400, seed: 42,
};
// JSX splits "31%" into two nodes — read each Text as the sentence a person actually sees
const visible = () => {
  const out: string[] = [];
  const flatten = (n: any): string =>
    typeof n === 'string' ? n : (n?.children ?? []).map(flatten).join('');
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (n.type === 'Text') { const t = flatten(n).trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};

beforeEach(() => { useStore.setState({ hideBalances: false } as any); });

test('ONE score: the odds are the only percentage that reads as a verdict', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 312_000 }} chance={31} band={{ low: 12, high: 58 }}
    horizonAge={90} retireAge={65} lens="preretired" />);
  const seen = visible();
  expect(seen).toContain('31%');
  expect(seen).toContain('odds of lasting to age 90');
  // the money is money — no second percentage anywhere near it
  const pcts = seen.filter((t) => /^\d{1,3}%$/.test(t));
  expect(pcts).toEqual(['31%']);
  // and no verdict word, per the 2026-08-12 ruling
  expect(screen.queryByText(/Likely|Uncertain|Unlikely|Holding|Watch closely|Running short/)).toBeNull();
});

test('the three lines subtract to each other, and the shortfall carries the weight', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 312_000 }} chance={31} band={null}
    horizonAge={90} retireAge={65} lens="preretired" />);
  expect(screen.getByText('On track for, at 65')).toBeOnTheScreen();
  expect(screen.getByText('Target nest egg')).toBeOnTheScreen();   // founder's words, 2026-08-12
  expect(screen.getByText('Short')).toBeOnTheScreen();
  const money = visible().filter((t) => /^\$[\d,]+$/.test(t)).map((t) => Number(t.replace(/[$,]/g, '')));
  expect(money.length).toBeGreaterThanOrEqual(3);
  const [onTrack, target, shortfall] = money;   // the three sum rows, in order, before the bridge
  expect(target - onTrack).toBe(shortfall);          // the arithmetic is real, to the dollar
});

test('someone ahead of the target is told so in plain words, not a number over 100%', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 3_000_000 }} chance={98} band={null}
    horizonAge={90} retireAge={65} lens="preretired" />);
  expect(screen.getByText('More than you need')).toBeOnTheScreen();
  expect(screen.queryByText('Short')).toBeNull();
  expect(screen.getByText(/cleared the 80% mark/)).toBeOnTheScreen();
  expect(visible().filter((t) => /^\d{1,3}%$/.test(t))).toEqual(['98%']);   // still one score only
});

test('the bridge sentence names the yearly amount and the tax-advantaged room', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 500_000 }} chance={52} band={null}
    horizonAge={90} retireAge={65} roomAnnual={32_500} lens="preretired" />);
  expect(screen.getByText(/Adding/)).toBeOnTheScreen();
  expect(screen.getByText(/a year closes it/)).toBeOnTheScreen();
  expect(screen.getByText(/fits in tax-advantaged room/)).toBeOnTheScreen();
});

test('when saving cannot be the answer: the honest number once, then the levers that move', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 120_000, guaranteed_monthly_income: 2_600 }} chance={9}
    band={null} horizonAge={90} retireAge={65} annualIncome={40_000} lens="preretired" />);
  expect(screen.getByText(/more than you earn\. That number is real/)).toBeOnTheScreen();
  expect(screen.getByText('WHAT ACTUALLY MOVES IT')).toBeOnTheScreen();
  const pts = visible().filter((t) => /^\+\d+ pts$/.test(t));
  expect(pts.length).toBeGreaterThan(0);
  // never a softened ask — the impossible figure is stated, not replaced by a smaller one
  expect(screen.queryByText(/a year closes it/)).toBeNull();
});

test('hide balances: the dollars mask, the odds stay — a percentage is not a balance', () => {
  useStore.setState({ hideBalances: true } as any);
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 312_000 }} chance={31} band={{ low: 12, high: 58 }}
    horizonAge={90} retireAge={65} lens="preretired" />);
  expect(visible().some((t) => /^\$[\d,]{3,}$/.test(t))).toBe(false);
  expect(screen.getByText('31%')).toBeOnTheScreen();
});

test('no inputs (nothing computable) — the block shows the score it was given and invents nothing', () => {
  render(<PlanOutcome inputs={null} chance={84} band={null} horizonAge={90} retireAge={65} lens="preretired" />);
  expect(screen.queryByText('Target nest egg')).toBeNull();
  expect(screen.queryByText(/closes it/)).toBeNull();
});
