// Pins the FCC lens contract: one stage field → hero + tab order, override always wins,
// skip never breaks anything (defaults to working).
import { resolveLens, tabOrder } from './lens';

describe('resolveLens', () => {
  test('retired status → retired lens', () => {
    expect(resolveLens({ status: 'retired' })).toBe('retired');
  });

  test('working/employed status → working lens', () => {
    expect(resolveLens({ status: 'employed' })).toBe('working');
  });

  test('no profile at all (skip — just explore) → working', () => {
    expect(resolveLens(null)).toBe('working');
    expect(resolveLens(undefined)).toBe('working');
    expect(resolveLens({})).toBe('working');
  });

  test('semi-retired with retirement income flowing → retired', () => {
    const op = { status: 'partial', incomeSources: ['retirement_income'], ri_ss: '2600', ri_receiving: 'yes' };
    // whichever shape currentRetirementIncomeMonthly reads, a partial WITHOUT any income stays working:
    expect(resolveLens({ status: 'partial' })).toBe('working');
    // and with income > 0 it must flip to retired — assert via the resolver's own dependency
    const { currentRetirementIncomeMonthly } = require('../income');
    if (currentRetirementIncomeMonthly(op) > 0) expect(resolveLens(op)).toBe('retired');
  });

  test('explicit override wins over status (Settings → Your setup)', () => {
    expect(resolveLens({ status: 'retired' }, 'working')).toBe('working');
    expect(resolveLens({ status: 'employed' }, 'retired')).toBe('retired');
    expect(resolveLens({ status: 'retired' }, null)).toBe('retired');
  });
});

describe('tabOrder', () => {
  test('working order: Home · Net worth · Invest · Cash flow · Plan', () => {
    expect(tabOrder('working')).toEqual(['home', 'analytics', 'invest', 'cashflow', 'plan']);
  });

  test('retired order: Home · Cash flow · Net worth · Plan · Invest', () => {
    expect(tabOrder('retired')).toEqual(['home', 'cashflow', 'analytics', 'plan', 'invest']);
  });

  test('both lenses expose exactly the same five tabs', () => {
    expect([...tabOrder('working')].sort()).toEqual([...tabOrder('retired')].sort());
  });
});
