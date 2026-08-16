// THE OUTCOME BLOCK — one score, then arithmetic (founder 2026-08-12).
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PlanOutcome } from '../PlanOutcome';
import { useStore } from '../../store/useStore';
import type { RetirementInputs } from '../../domain/retirement';

// PAT'S REAL INPUTS (corrected 2026-08-14). The fixture used to assume 7.7% growth and no saving,
// which put him ABOVE the 80% line — so the closing sentence, which only speaks to someone still
// short, never rendered here. His four accounts blend to 5.85% and he puts away $12,000 a year;
// those are the numbers pinned in brief_figures_guard and the ones every persona figure comes from.
const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90,
  start_balance: 909_152, annual_contribution: 12_000, retire_monthly_spend_today: 5_200,
  guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  inflation: 0.025, mean_return: 0.0585, vol_return: 0.0752, paths: 400, seed: 42,
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

// ── SUPERSEDED 2026-08-14 by the approved v4 design ──────────────────────────────────────────────
// The three tests that stood here pinned the OLD hero: a three-row arithmetic block ("On track for" /
// "Target nest egg" / "Short") above a bridge sentence reading "Adding $X a year closes it."
//
// Three founder rulings replaced all of it. The target is a number the PERSON TYPES, not the
// 80%-odds pot we derived and labelled as theirs. It gets its own dial beside the odds, because
// "am I hitting my own number" and "will the money last" are different questions that are allowed
// to disagree. And the closing sentence must say that GROWTH does nearly half the work — the
// founder read the old one, did the only subtraction available ($77,500 x 7 = $542,500 against a
// $1,090,848 gap) and asked how the number could possibly be right. It was; the sentence was not.

test('the two dials answer different questions, and the typed target never moves the odds', () => {
  const withTarget = { ...PAT, start_balance: 909_152 };
  render(<PlanOutcome inputs={withTarget} chance={67} band={null} horizonAge={90} retireAge={65}
    typedTarget={2_000_000} lens="preretired" />);
  expect(screen.getByText('67%')).toBeOnTheScreen();               // odds — counts simulations
  expect(screen.getByText('45%')).toBeOnTheScreen();               // target — divides two dollar figures
  expect(screen.getByText('of your target nest egg')).toBeOnTheScreen();
  expect(screen.getByText(/short/)).toBeOnTheScreen();
});

test('past their own target: the numeral passes 100% and "short" becomes "more than you set"', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 909_152 }} chance={67} band={null}
    horizonAge={90} retireAge={65} typedTarget={800_000} lens="preretired" />);
  expect(screen.getByText('114%')).toBeOnTheScreen();              // never capped — 114% is true
  expect(screen.getByText(/more than you set/)).toBeOnTheScreen();
  expect(screen.queryByText(/— short/)).toBeNull();
});

test('while the target is blank we FILL IT IN and say it is ours, never theirs', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 909_152 }} chance={67} band={null}
    horizonAge={90} retireAge={65} lens="preretired" />);
  // the defect this fixes shipped for months: a row labelled "Target nest egg" showing a figure the
  // person never typed, with nothing saying we picked it.
  expect(screen.getByText(/our starting figure, not yours/)).toBeOnTheScreen();
  expect(screen.getByText(/Change it to your own number/)).toBeOnTheScreen();
  expect(screen.queryByText('of your target nest egg')).toBeNull();   // no dial without their number
});

test('the closing sentence PROJECTS rather than promises, and explains where the growth comes from', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 909_152 }} chance={67} band={null}
    horizonAge={90} retireAge={65} typedTarget={2_000_000} lens="preretired" />);
  expect(screen.getByText(/projects to/)).toBeOnTheScreen();
  expect(screen.queryByText(/reaches your target/)).toBeNull();        // never a promise (§7.1)
  expect(screen.getByText(/Growth does almost half the work/)).toBeOnTheScreen();
  expect(screen.getByText(/growing what you already have/)).toBeOnTheScreen();
  expect(screen.getByText(/an estimate, not a promise/)).toBeOnTheScreen();
});

test('the simulation note sits under the odds, not as a footnote over the whole page', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 909_152 }} chance={67} band={null}
    horizonAge={90} retireAge={65} typedTarget={2_000_000} lens="preretired" />);
  expect(screen.getByText(/about 400 runs of your own numbers/)).toBeOnTheScreen();
});

test('a retiree sees NO target dial and no saving sentence — wrong question once drawing down', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 985_000 }} chance={100} band={null}
    horizonAge={94} retireAge={72} typedTarget={2_000_000} lens="retired" />);
  expect(screen.queryByText('of your target nest egg')).toBeNull();
  expect(screen.queryByText(/projects to/)).toBeNull();
});

test('and it says nothing about tax-advantaged room when we were never told a contribution', () => {
  render(<PlanOutcome inputs={{ ...PAT, start_balance: 500_000 }} chance={52} band={null}
    horizonAge={90} retireAge={65} lens="preretired" />);
  expect(screen.queryByText(/tax-advantaged room/)).toBeNull();
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
