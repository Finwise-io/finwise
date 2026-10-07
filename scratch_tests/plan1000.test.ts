// Scratch: every Plan figure re-run at 1,000 futures — the count the app itself runs.
import { simulate, type RetirementInputs } from '../src/domain/retirement';
import { solveSafeDraw } from '../src/domain/paycheck';
import { ssBenefitAtClaimAge } from '../src/domain/retirement/ssTiming';
import { blendedReturn, blendedVolatility } from '../src/domain/assets';
import { targetAtRetirement } from '../src/domain/planning/target';

const BASE = { inflation: 0.025, seed: 42, paths: 1000, vol_return: 0.0935, mean_return: 0.055 };
const odds = (o: any) => simulate({ ...BASE, ...o } as RetirementInputs).chance_of_success;
const proj = (o: any) => Math.round(simulate({ ...BASE, ...o } as RetirementInputs).projected_at_retirement);
const PAT_ACCOUNTS = [
  { asset_id: 'a', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 380_000 },
  { asset_id: 'b', kind: 'savings', tax_bucket: 'CASH', balance: 379_152 },
  { asset_id: 'c', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 90_000 },
  { asset_id: 'd', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 60_000 },
] as any;
const PAT = { current_age: 58, horizon_age: 90, retire_age: 65, start_balance: 909_152,
  retire_monthly_spend_today: 5200, guaranteed_monthly_income: 0, guaranteed_start_age: 67,
  mean_return: blendedReturn(PAT_ACCOUNTS), vol_return: blendedVolatility(PAT_ACCOUNTS) };
const JUNE = { current_age: 72, horizon_age: 94, retire_age: 72, start_balance: 985_000,
  annual_contribution: 0, guaranteed_monthly_income: 4000, guaranteed_start_age: 72 };
const RAY = { current_age: 64, horizon_age: 92, retire_age: 67, start_balance: 500_000,
  annual_contribution: 6000, retire_monthly_spend_today: 4800 };

test('every Plan figure at 1,000 futures', () => {
  const L: string[] = [];
  L.push(`PAT return ${((blendedReturn(PAT_ACCOUNTS) ?? 0) * 100).toFixed(2)}% vol ${(blendedVolatility(PAT_ACCOUNTS) * 100).toFixed(2)}%`);
  for (const save of [12_000, 17_500, 77_500]) {
    L.push(`PAT saving ${save}: odds ${odds({ ...PAT, annual_contribution: save })} · projected ${proj({ ...PAT, annual_contribution: save })}`);
  }
  L.push(`PAT target for 80% odds: ${Math.round(targetAtRetirement({ ...PAT, ...BASE, annual_contribution: 12_000 } as any) ?? 0)}`);
  L.push(`JUNE odds at 5,600 spend: ${odds({ ...JUNE, retire_monthly_spend_today: 5600 })}`);
  L.push(`JUNE safe draw at 80%: ${solveSafeDraw(985_000, 4000, { current_age: 72, horizon_age: 94, ...BASE } as any, 80)}`);
  for (const extra of [1000, 1500, 2000, 2200, 2500]) {
    L.push(`JUNE spend +${extra}: odds ${odds({ ...JUNE, retire_monthly_spend_today: 5600 + extra })}`);
  }
  const ss67 = Math.round(ssBenefitAtClaimAge(2600, 67)), ss70 = Math.round(ssBenefitAtClaimAge(2600, 70));
  L.push(`RAY ss monthly: at 67 ${ss67} · at 70 ${ss70}`);
  L.push(`RAY claim 67: odds ${odds({ ...RAY, guaranteed_monthly_income: ss67, guaranteed_start_age: 67 })}`);
  L.push(`RAY claim 70: odds ${odds({ ...RAY, guaranteed_monthly_income: ss70, guaranteed_start_age: 70 })}`);
  console.log('\n===FIGURES===\n' + L.join('\n') + '\n===END===');
  expect(L.length).toBeGreaterThan(0);
});
