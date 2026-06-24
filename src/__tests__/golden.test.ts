// Golden-scenario verification — the "known-good spreadsheet."
// Each case is HAND-COMPUTED (shown in comments) and asserted against the production function.
// Traces to docs/finwise-qa-plan.md §1 / Appendix A (QA-T1-001..012). A failure here means a
// money number the user sees has drifted from first-principles math — a Tier-1 / S1 regression.
import { projectNestEgg, capitalNeeded, simulate, type RetirementInputs } from '../domain/retirement';
import { taxOwed, marginalBracket, effectiveRateOnGross, grossFromNet, taxableIncome } from '../domain/income/tax';
import { loanPayment } from '../domain/debt';
import { currentYield, bondInfo } from '../domain/bonds';
import { rmdAtAge, rmdDivisor } from '../domain/decumulation';
import {
  earmarkedAmount, retirementEarmarkedValue, investableAssets,
  benchmarkReturn, blendedReturn, portfolioActualReturn, type AssetAccount,
} from '../domain/assets';

// minimal AssetAccount factory — only the fields the math reads
const acct = (p: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'a1' as any, label: 'x', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.07, ...p,
});

describe('QA-T1: Golden financial scenarios (hand-computed)', () => {
  // ── QA-T1-001  Compound growth / deterministic projection ────────────────
  // $100,000 @ 7%, no contributions, 10 years, no inflation, no spend.
  // FV = 100000 × 1.07^10 = 100000 × 1.9671513573… = 196,715.135729 → round2 196,715.14
  test('QA-T1-001 projectNestEgg compound FV: $100k @7% × 10y = $196,715.14', () => {
    const inp: RetirementInputs = {
      current_age: 55, retire_age: 65, horizon_age: 65, start_balance: 100_000,
      annual_contribution: 0, retire_monthly_spend_today: 0, guaranteed_monthly_income: 0,
      inflation: 0, mean_return: 0.07, vol_return: 0,
    };
    const p = projectNestEgg(inp);
    expect(p.will_have).toBe(196_715.14);   // 4-dp truth 196,715.1357, rounded at the edge (DR-11)
    expect(p.will_need).toBe(0);
    expect(p.shortfall).toBe(0);
  });

  // ── QA-T1-002  Monte-Carlo determinism: vol=0 collapses to the closed-form FV ──
  test('QA-T1-002 simulate with vol=0 == deterministic FV (ties sim ↔ projection)', () => {
    const inp: RetirementInputs = {
      current_age: 55, retire_age: 65, horizon_age: 65, start_balance: 100_000,
      annual_contribution: 0, retire_monthly_spend_today: 0, guaranteed_monthly_income: 0,
      inflation: 0, mean_return: 0.07, vol_return: 0, paths: 200, seed: 42,
    };
    expect(simulate(inp).projected_at_retirement).toBe(196_715.14);
  });

  // ── QA-T1-003  Seed reproducibility: identical seed → identical result ───────
  test('QA-T1-003 simulate is reproducible for a fixed seed, and bounded 0–100', () => {
    const inp: RetirementInputs = {
      current_age: 40, retire_age: 65, horizon_age: 90, start_balance: 250_000,
      annual_contribution: 24_000, retire_monthly_spend_today: 6_000, guaranteed_monthly_income: 2_500,
      inflation: 0.025, mean_return: 0.06, vol_return: 0.12, paths: 400, seed: 7,
    };
    const a = simulate(inp), b = simulate(inp);
    expect(a.chance_of_success).toBe(b.chance_of_success);
    expect(a.projected_at_retirement).toBe(b.projected_at_retirement);
    expect(a.chance_of_success).toBeGreaterThanOrEqual(0);
    expect(a.chance_of_success).toBeLessThanOrEqual(100);
  });

  // ── QA-T1-004  Capital-needed (amortized, net of guaranteed income) ──────────
  // spend $5,000/mo, guaranteed $2,000/mo, retire 65, plan-to 95 (30 yrs), real 3%, no bequest.
  // netAnnual = (5000−2000)×12 = 36,000.  annuityFactor = (1 − 1.03^-30)/0.03 = 19.6004…
  // needed = 36,000 × 19.600440 = 705,615.84
  test('QA-T1-004 capitalNeeded: $3k/mo net for 30y @3% real ≈ $705,615.84', () => {
    const c = capitalNeeded({
      monthlySpend: 5_000, guaranteedMonthly: 2_000, retireAge: 65,
      horizonAge: 95, realReturn: 0.03, bequest: 0,
    });
    expect(c.years).toBe(30);
    expect(c.netAnnual).toBe(36_000);
    expect(c.annuityFactor).toBe(19.6);            // round2 of 19.6004
    expect(c.needed).toBeCloseTo(705_615.84, 0);   // within $0.5 of hand value
    expect(c.pvBequest).toBe(0);
  });

  // ── QA-T1-005..007  Federal tax (2026 single, std deduction $16,100) ─────────
  // gross $100,000 → taxable 83,900.
  //   10%×12,400          = 1,240
  //   12%×(50,400−12,400) = 4,560
  //   22%×(83,900−50,400) = 7,370
  //   total               = 13,170
  test('QA-T1-005 taxOwed($100k) = $13,170; marginal 22%; effective 13.17%', () => {
    expect(taxableIncome(100_000)).toBe(83_900);
    expect(taxOwed(100_000)).toBe(13_170);
    expect(marginalBracket(100_000)).toBe(0.22);
    expect(effectiveRateOnGross(100_000)).toBeCloseTo(0.1317, 4);
  });
  test('QA-T1-006 grossFromNet inverts taxOwed (round-trips $100k within $2)', () => {
    const net = 100_000 - taxOwed(100_000);        // 86,830 take-home
    expect(Math.abs(grossFromNet(net) - 100_000)).toBeLessThanOrEqual(2);
  });
  test('QA-T1-007 tax below the standard deduction is zero', () => {
    expect(taxOwed(10_000)).toBe(0);
    expect(grossFromNet(0)).toBe(0);
  });

  // ── QA-T1-008  Loan amortization ────────────────────────────────────────────
  // $30,000 @ 6% APR, 5 yr.  r=0.005, n=60.  monthly = 30000×0.005/(1−1.005^-60) = $579.98 (hand-checked).
  // totalPaid = monthly×60 = 34,799.04; interest = 4,799.04 (full-precision monthly, rounded at the edge).
  test('QA-T1-008 loanPayment($30k, 6%, 5y): $579.98/mo, ~$4,799 interest', () => {
    const l = loanPayment(30_000, 6, 5);
    expect(l.monthly).toBe(579.98);
    expect(l.totalInterest).toBe(4_799.04);
    expect(l.totalPaid).toBe(34_799.04);
    expect(l.totalPaid).toBeCloseTo(l.totalInterest + 30_000, 2);  // accounting identity holds
  });

  // ── QA-T1-009  Bond current yield ───────────────────────────────────────────
  // $10,000 face @ 4.5% coupon = $450/yr; current value $9,500 → 450/9,500 = 0.047368 → 0.0474
  test('QA-T1-009 currentYield: $450 coupon / $9,500 value = 0.0474', () => {
    const b = bondInfo(acct({ face_value: 10_000, coupon_rate: 0.045, balance: 9_500, maturity_date: '2043-01-01' }));
    expect(currentYield(b)).toBe(0.0474);
  });

  // ── QA-T1-010  RMD (IRS Uniform Lifetime Table) ─────────────────────────────
  // age 73 divisor = 26.5.  $500,000 / 26.5 = 18,867.9245… → round2 18,867.92
  test('QA-T1-010 rmdAtAge($500k, 73): divisor 26.5 → $18,867.92', () => {
    expect(rmdDivisor(73)).toBe(26.5);
    expect(rmdAtAge(500_000, 73)).toBe(18_867.92);
    expect(rmdAtAge(500_000, 72)).toBe(0);          // below RMD start age → no RMD
  });

  // ── QA-T1-011  Asset earmarking (nest-egg basis, DR-3 derive-don't-store) ────
  // Term #7: CASH 0% earmarked (liquidity, not the invested portfolio); investment/retirement 100%; PROPERTY 0%.
  test('QA-T1-011 earmarkedAmount / retirementEarmarkedValue / investableAssets', () => {
    const cash = acct({ kind: 'savings', tax_bucket: 'CASH', balance: 10_000 });
    const brok = acct({ kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100_000 });
    const home = acct({ kind: 'home', tax_bucket: 'PROPERTY', balance: 400_000 });
    expect(earmarkedAmount(cash)).toBe(0);                  // 0% default (cash = emergency/near-term)
    expect(earmarkedAmount(brok)).toBe(100_000);            // 100% default
    expect(earmarkedAmount(home)).toBe(0);                  // property never funds retirement
    expect(retirementEarmarkedValue([cash, brok, home])).toBe(100_000);   // brokerage only
    expect(investableAssets([cash, brok, home])).toBe(110_000);   // excludes real estate + personal property (here: the home)
  });

  // ── QA-T1-012  Blended / benchmark / actual return ──────────────────────────
  // Term #7: brokerage $100k @0.08 earmark 100% (=100k) + savings $100k @0.024 earmark 0% (=0):
  // weighted = 100000×0.08 + 0×0.024 = 8,000 ; total earmark 100,000 ; blended = 8,000/100,000 = 0.08
  // (cash no longer drags the nest-egg return down, because it's no longer IN the nest egg).
  test('QA-T1-012 blendedReturn value-weights benchmarks across the earmarked nest egg', () => {
    const brok = acct({ kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100_000 });
    const sav = acct({ kind: 'savings', tax_bucket: 'CASH', balance: 100_000 });
    expect(benchmarkReturn('brokerage')).toBe(0.08);
    expect(benchmarkReturn('savings')).toBe(0.024);
    expect(benchmarkReturn('unknown_kind')).toBe(0.06);          // safe fallback
    expect(benchmarkReturn('brokerage', { brokerage: 0.10 })).toBe(0.10);  // user override
    expect(blendedReturn([brok, sav])).toBe(0.08);
    expect(blendedReturn([])).toBe(0.06);                        // empty → fallback, never NaN
    expect(portfolioActualReturn([brok, sav])).toBeNull();       // none reported → null, not fake 0%
  });
});
