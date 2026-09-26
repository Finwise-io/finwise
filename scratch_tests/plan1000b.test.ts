import { simulate, type RetirementInputs } from '../src/domain/retirement';
const BASE = { inflation: 0.025, seed: 42, paths: 1000, vol_return: 0.0935, mean_return: 0.055 };
const JUNE = { current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
  annual_contribution: 0, guaranteed_monthly_income: 4000, guaranteed_start_age: 72 };
const odds = (spend: number) => simulate({ ...BASE, ...JUNE, retire_monthly_spend_today: spend } as RetirementInputs).chance_of_success;
test('June: the most she can spend while holding 80', () => {
  const L: string[] = [];
  let best = 0;
  for (let extra = 2000; extra <= 2600; extra += 20) { const o = odds(5600 + extra); if (o >= 80) best = extra; L.push(`+${extra} → ${o}`); }
  L.push(`MAX EXTRA HOLDING 80%: ${best} (spend ${5600 + best}, paycheck ${4000 + (5600 + best - 4000)})`);
  console.log('\n===JUNE===\n' + L.filter((_, i) => i % 3 === 0 || _.startsWith('MAX')).join('\n') + '\n===END===');
  expect(best).toBeGreaterThan(0);
});
