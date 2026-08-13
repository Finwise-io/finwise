// PLAN ENGINE PROBE (mock-match audit, 2026-08-12) — the step a string diff cannot do: check that
// the numbers the Plan tab prints reconcile with each other and with the engine that produced them.
// It MEASURES and records to /tmp/plan-engine-probe.json; the audit workbook quotes these figures
// (mockups/Plan-redesign-Aug-12/plan-mock-match-audit-2026-08-12.xlsx, Defects D1–D3, D6).
import * as fs from 'fs';
import { planTarget, leverDeltas, TARGET_ODDS } from '../domain/planning/target';
import { simulate, type RetirementInputs } from '../domain/retirement';

const PAT: RetirementInputs = {
  current_age: 58, retire_age: 65, horizon_age: 90,
  start_balance: 909152, annual_contribution: 0,
  retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0,
  mean_return: 0.055, vol_return: 0.0935, inflation: 0.025,
  seed: 42, paths: 400,
} as any;

const probe: any = {};

test('probe: the three money lines, the bridge sentence and the engine behind them', () => {
  const t = planTarget(PAT, 132000);
  const short = (t.targetAtRetirement ?? 0) - t.projectedAtRetirement;

  probe.printed = {
    odds: t.odds,
    onTrackFor: t.projectedAtRetirement,
    target: t.targetAtRetirement,
    short,
    requiredExtraAnnual: t.requiredExtraAnnual,
    years: t.yearsToRetire,
    askedOverThoseYears: (t.requiredExtraAnnual ?? 0) * t.yearsToRetire,
  };
  probe.reconciliation = {
    targetOdds: TARGET_ODDS,
    // the target held in the target's OWN model (a plan that begins the day they retire)
    oddsHoldingTheTargetAtRetirement: simulate({
      ...PAT, current_age: PAT.retire_age, retire_age: PAT.retire_age,
      start_balance: t.targetAtRetirement ?? 0, annual_contribution: 0,
    }).chance_of_success,
    // the same gap closed the way this person actually closes it
    oddsAfterClosingTheShortfall: simulate({ ...PAT, start_balance: PAT.start_balance + short }).chance_of_success,
    // the odds the bridge sentence promises to deliver
    oddsAfterTheAskedSaving: simulate({ ...PAT, annual_contribution: t.requiredExtraAnnual ?? 0 }).chance_of_success,
  };
  expect(t.targetAtRetirement).not.toBeNull();
});

test('probe: how many levers the impossible state can offer', () => {
  const broke: any = { ...PAT, current_age: 64, retire_age: 65, start_balance: 20000, retire_monthly_spend_today: 9000 };
  const t = planTarget(broke, 50000);
  const levers = leverDeltas(broke);
  probe.impossibleState = {
    impossible: t.impossible,
    odds: t.odds,
    leverCount: levers.length,
    levers: levers.map((l) => `${l.label} +${l.points}`),
  };
  expect(t.impossible).toBe(true);
});

afterAll(() => { fs.writeFileSync('/tmp/plan-engine-probe.json', JSON.stringify(probe, null, 1)); });
