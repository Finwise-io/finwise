import { taxBucketSplit, withdrawalPlan, depletionAge, withdrawalOrder, rmdAtAge, rmdDivisor, RMD_START_AGE } from './index';
import type { AssetAccount } from '../assets';

const a = (id: string, bucket: AssetAccount['tax_bucket'], balance: number, pct = 100): AssetAccount =>
  ({ asset_id: id, label: id, tax_bucket: bucket, balance, target_return: 0.06, retirement_pct: pct });

describe('decumulation', () => {
  test('tax-bucket split (earmarked) by treatment', () => {
    const s = taxBucketSplit([
      a('brk', 'TAXABLE', 200000), a('401k', 'PRE_TAX', 300000), a('roth', 'ROTH', 100000),
      a('cash', 'CASH', 50000, 100), a('home', 'PROPERTY', 800000),
    ]);
    expect(s.taxable).toBe(200000);
    expect(s.preTax).toBe(300000);
    expect(s.roth).toBe(100000);
    expect(s.cash).toBe(50000);
    expect(s.total).toBe(650000);   // property excluded
  });

  test('withdrawal plan: net of guaranteed income + rate band', () => {
    // spend $6,000/mo, SS $2,000/mo, nest egg $1.2M → net $48k/yr → 4.0% → safe
    const p = withdrawalPlan(6000, 2000, 1_200_000);
    expect(p.netWithdrawal).toBe(48000);
    expect(p.withdrawalRate).toBeCloseTo(0.04, 4);
    expect(p.rateBand).toBe('safe');
    // higher spend → high band
    expect(withdrawalPlan(8000, 2000, 1_000_000).rateBand).toBe('high'); // 72k/1M = 7.2%
    // guaranteed covers spend → no withdrawal needed
    expect(withdrawalPlan(2000, 3000, 500000).netWithdrawal).toBe(0);
  });

  test('depletion age: runs out vs lasts to horizon', () => {
    // $500k, $60k/yr net, 4% return, 3% inflation → depletes before 90
    const dep = depletionAge({ age: 65, horizon: 95, nestEgg: 500000, netWithdrawalNow: 60000, returnRate: 0.04, inflation: 0.03 });
    expect(dep).not.toBeNull();
    expect(dep! < 95).toBe(true);
    // small withdrawal vs big egg → lasts (null)
    expect(depletionAge({ age: 65, horizon: 90, nestEgg: 2_000_000, netWithdrawalNow: 40000, returnRate: 0.05, inflation: 0.03 })).toBeNull();
  });

  test('withdrawal order: cash → taxable → pre-tax → roth, only non-empty buckets', () => {
    const order = withdrawalOrder({ taxable: 200000, preTax: 300000, roth: 100000, cash: 0, total: 600000 });
    expect(order.map((o) => o.bucket)).toEqual(['taxable', 'preTax', 'roth']);   // cash empty → skipped
    expect(order[0].amount).toBe(200000);
  });

  test('RMD: none before 73, then balance ÷ divisor', () => {
    expect(rmdAtAge(500000, 70)).toBe(0);
    expect(RMD_START_AGE).toBe(73);
    expect(rmdDivisor(73)).toBe(26.5);
    expect(rmdAtAge(500000, 73)).toBeCloseTo(500000 / 26.5, 0);
    expect(rmdDivisor(81)).toBeGreaterThan(rmdDivisor(85));   // divisor shrinks with age
  });
});
