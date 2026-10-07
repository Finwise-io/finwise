/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "networth 03", written by Claude from the cards alone.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_networth03_claude.json.
 * Every expected answer below is the outside model's, copied as it wrote it; only its plain input names
 * are mapped onto the app's (its kind "529" is 'college_529', "roth" is 'roth_ira', "valuables" and
 * "other" with class personal_property keep that class; its "age" is a birth year). A case the app
 * fails is a finding, fixed in the function — never by changing the answer here. Where it wrote RULE
 * UNCLEAR and gave two readings, the reading the app holds is named on the line, with whose rule it is.
 *
 * HELD AT THE APP'S ANSWER, NOT ITS OWN — each named where it stands, with the reason:
 *   MK-NW-F-030, two cases: a second car and valuables count toward retirement (owner, 2026-08-11,
 *   DEC-0100: "all assets minus primary home and primary car").
 *   MK-NW-F-041, one case: the Roth answer is not held at the IRA limit (the question does not say which Roth).
 */
import {
  assetAllocation, earmarkDefault, primaryCarIdOf, earmarkedAmount, retirementEarmarkedValue, benchmarkReturn,
  benchmarkInfo, blendedReturn, buildAssetsState, monthlyContributionsFromOnboarding, sourceWording,
  historyCoverage, uberGroupRows,
} from '../../../src/domain/assets';
import { itemizedResultTotal, buildItemizedAccounts } from '../../../src/domain/assets/itemize';

const acct = (over: Record<string, any> = {}) =>
  ({ asset_id: over.id ?? over.asset_id ?? 'a', label: 'Account', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.06, ...over }) as any;
const kinds: Record<string, string> = { '529': 'college_529', roth: 'roth_ira' };
const k = (kind: string, over: Record<string, any> = {}) => {
  const id = kinds[kind] ?? kind;
  const bucket = ['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt'].includes(id) ? 'CASH'
    : ['home', 'vehicle', 'valuables', 'other'].includes(id) ? 'PROPERTY'
    : ['401k', 'trad_ira', 'hsa'].includes(id) ? 'PRE_TAX' : id === 'roth_ira' ? 'ROTH' : 'TAXABLE';
  return acct({ kind: id === 'other' ? 'other_asset' : id, tax_bucket: bucket, ...over });
};
const sum = (b: Record<string, number>) => Object.values(b).reduce((t, v) => t + v, 0);
const ZERO = { cash: 0, bonds: 0, stocks_etf: 0, alternatives: 0, real_estate: 0, personal_property: 0, mixed: 0 };

describe('MK-NW-F-029 assetAllocation — five cases', () => {
  test('easy · checking and a brokerage', () => {
    expect(assetAllocation([k('checking', { balance: 10000 }), k('brokerage', { id: 'b', balance: 50000, asset_class: 'stocks_etf' })])).toEqual({ ...ZERO, cash: 10000, stocks_etf: 50000 });
  });
  test('easy · a home and a car', () => {
    expect(assetAllocation([k('home', { balance: 400000 }), k('vehicle', { id: 'v', balance: 30000 })])).toEqual({ ...ZERO, real_estate: 400000, personal_property: 30000 });
  });
  test('complex · the approved drawing’s household', () => {
    const b = assetAllocation([k('checking', { balance: 8000 }),
      k('brokerage', { id: 'v', source: 'connected', balance: 349333, cash_balance: 838, positions: [{ ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', asset_class: 'stock_etf', last_price: 348.495, lots: [{ shares: 1000, cost_per_share: 0, purchase_date: '' }] }] }),
      k('fixed_income', { id: 'e', balance: 5819 }), k('home', { id: 'h', balance: 450000 })]);
    expect(b.cash).toBeCloseTo(8838, 4); expect(b.stocks_etf).toBeCloseTo(348495, 4); expect(b.bonds).toBe(5819); expect(b.real_estate).toBe(450000);
    expect(sum(b)).toBeCloseTo(813152, 4);
  });
  test('complex · a hand-built brokerage with its own cash sleeve', () => {
    const b = assetAllocation([k('checking', { balance: 3140.2 }),
      k('brokerage', { id: 'b', derive_balance: true, cash_balance: 4212.55, balance: 66092.55, positions: [{ ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', asset_class: 'stock_etf', lots: [{ shares: 200, cost_per_share: 0, purchase_date: '' }] }] }),
      k('crypto', { id: 'c', balance: 4100 }), k('401k', { id: 'r', balance: 212640.18 })]);
    expect(b.cash).toBeCloseTo(7352.75, 4);                                // the formula as sent gave $3,140.20
    expect(b.stocks_etf).toBeCloseTo(61880, 4);
    expect([b.alternatives, b.mixed]).toEqual([4100, 212640.18]);
    expect(sum(b)).toBeCloseTo(285972.93, 4);
  });
  test('edge · nothing entered', () => { expect(assetAllocation([])).toEqual(ZERO); });
});

describe('MK-NW-F-030 earmarkDefault — five cases', () => {
  test('easy · a 401(k)', () => { expect(earmarkDefault(k('401k'))).toBe(100); });
  test('easy · a 529', () => { expect(earmarkDefault(k('529'))).toBe(0); });
  test('complex · two cars and a jewellery collection', () => {
    const lexus = k('vehicle', { id: 'lexus', balance: 31850 }), honda = k('vehicle', { id: 'honda', balance: 14200 });
    const jewellery = k('valuables', { id: 'jewellery', asset_class: 'personal_property', balance: 15000 });
    expect(earmarkDefault(lexus, 'lexus')).toBe(0);
    // HELD AT THE APP'S ANSWER — the owner's rule (2026-08-11, DEC-0100): "all assets minus primary home and
    // primary car. If they want they can change which asset should not count." A second car and valuables count.
    expect(earmarkDefault(honda, 'lexus')).toBe(100);                      // its answer: 0
    expect(earmarkDefault(jewellery, 'lexus')).toBe(100);                  // its answer: 0
  });
  test('complex · primary, rental and vacation homes', () => {
    expect([k('home', { re_use: 'primary' }), k('home', { re_use: 'rental' }), k('home', { re_use: 'secondary' })].map((a) => earmarkDefault(a))).toEqual([0, 100, 100]);
  });
  test('edge · a home with no use recorded', () => {
    // RULE UNCLEAR, its reading 1: an only home with no use recorded is the home lived in
    expect(earmarkDefault(k('home', { re_use: null }))).toBe(0);
  });
});

describe('MK-NW-F-031 primaryCarIdOf — five cases', () => {
  test('easy · one car', () => { expect(primaryCarIdOf([k('vehicle', { id: 'v1', balance: 25000 })])).toBe('v1'); });
  test('easy · no vehicles', () => { expect(primaryCarIdOf([k('checking', { id: 'c1' }), k('home', { id: 'h1' })])).toBeUndefined(); });
  test('complex · a car and a more valuable jewellery collection', () => {
    expect(primaryCarIdOf([k('vehicle', { id: 'v2', balance: 24300 }), k('valuables', { id: 'j1', asset_class: 'personal_property', balance: 41000 }), k('other', { id: 'b1', asset_class: 'personal_property', balance: 19750 })])).toBe('v2');   // the formula as sent gave j1
  });
  test('complex · two cars of different value', () => {
    expect(primaryCarIdOf([k('vehicle', { id: '7', balance: 31850 }), k('vehicle', { id: '3', balance: 14200 })])).toBe('7');
  });
  test('edge · two cars of exactly equal value', () => {
    expect(primaryCarIdOf([k('vehicle', { id: 'c2', balance: 20000 }), k('vehicle', { id: 'c1', balance: 20000 })])).toBe('c1');
  });
});

describe('MK-NW-F-032 earmarkedAmount — five cases', () => {
  test('easy · a stated share', () => { expect(earmarkedAmount(acct({ balance: 100000, retirement_pct: 40 }))).toBe(40000); });
  test('easy · no share stated — the default', () => { expect(earmarkedAmount(k('401k', { balance: 200000, retirement_pct: null }))).toBe(200000); });
  test('complex · a typed share above 100%', () => { expect(earmarkedAmount(acct({ balance: 87345.2, retirement_pct: 150 }))).toBeCloseTo(87345.2, 6); });
  test('complex · a quarter of a brokerage', () => { expect(earmarkedAmount(acct({ balance: 186420, retirement_pct: 25 }))).toBe(46605); });
  test('edge · a stated 0% on a 401(k)', () => { expect(earmarkedAmount(k('401k', { balance: 150000, retirement_pct: 0 }))).toBe(0); });
});

describe('MK-NW-F-033 retirementEarmarkedValue — five cases', () => {
  test('easy · two retirement accounts', () => { expect(retirementEarmarkedValue([k('401k', { balance: 300000 }), k('trad_ira', { id: 'i', balance: 100000 })])).toBe(400000); });
  test('easy · a 529 is left out', () => { expect(retirementEarmarkedValue([k('529', { balance: 50000 }), k('401k', { id: 'r', balance: 100000 })])).toBe(100000); });
  test('complex · two earners, a part-earmarked brokerage, a 529 and the home', () => {
    const accounts = [k('401k', { id: 'a', balance: 412350 }), k('trad_ira', { id: 'b', balance: 73880 }), k('brokerage', { id: 'c', balance: 186420, retirement_pct: 25 }), k('529', { id: 'd', balance: 38200 }), k('home', { id: 'e', re_use: 'primary', balance: 650000 })];
    expect(retirementEarmarkedValue(accounts)).toBe(532835);
    expect(accounts.map((a) => earmarkedAmount(a))).toEqual([412350, 73880, 46605, 0, 0]);   // the rows add to the total
  });
  test('complex · half a savings account, a Roth and the car', () => {
    expect(retirementEarmarkedValue([k('401k', { id: 'a', balance: 238905.12 }), k('roth', { id: 'b', balance: 61233.4 }), k('hysa', { id: 'c', balance: 22416.73, retirement_pct: 50 }), k('vehicle', { id: 'lexus', balance: 31850 })])).toBeCloseTo(311346.885, 6);
  });
  test('edge · nothing entered', () => { expect(retirementEarmarkedValue([])).toBe(0); });
});

describe('MK-NW-F-034 benchmarkReturn — five cases', () => {
  test('easy · the table rate', () => { expect(benchmarkReturn('brokerage', {})).toBe(0.08); });
  test('easy · the person’s own rate', () => { expect(benchmarkReturn('crypto', { crypto: 0.15 })).toBe(0.15); });
  test('complex · a capital letter in the kind', () => {
    // RULE UNCLEAR, its reading 1: an exact id — only the app writes kinds
    expect(benchmarkReturn('Checking', {})).toBe(0.06);
  });
  test('complex · an override of exactly zero', () => { expect(benchmarkReturn('savings', { savings: 0 })).toBe(0); });
  test('edge · no kind', () => { expect(benchmarkReturn(undefined, {})).toBe(0.06); });
});

describe('MK-NW-F-036 benchmarkInfo — five cases', () => {
  test('easy · a custom estimate', () => {
    const i = benchmarkInfo('brokerage', { brokerage: 0.09 });
    expect([i.ret, i.source, i.edited]).toEqual([0.09, 'Your custom estimate', true]);
  });
  test('easy · an unknown kind', () => {
    const i = benchmarkInfo('boat', {});
    expect([i.ret, i.source, i.edited, i.estimate]).toEqual([0.06, 'Generic blended estimate', false, true]);
  });
  test('complex · a retirement wrapper with no override of its own', () => {
    const i = benchmarkInfo('401k', { brokerage: 0.09 });
    expect([i.ret, i.edited]).toEqual([0.079, false]);
    expect(i.source).not.toBe('Your custom estimate');
  });
  test('complex · a zero override', () => {
    const i = benchmarkInfo('savings', { savings: 0 });
    expect([i.ret, i.source, i.edited]).toEqual([0, 'Your custom estimate', true]);
  });
  test('edge · no kind at all', () => {
    const i = benchmarkInfo(undefined, {});
    expect([i.ret, i.source, i.edited]).toEqual([0.06, 'Generic blended estimate', false]);
  });
});

describe('MK-NW-F-037 blendedReturn — five cases', () => {
  test('easy · one 401(k)', () => { expect(blendedReturn([k('401k', { balance: 100000 })])).toBeCloseTo(0.079, 9); });
  test('easy · two equal accounts', () => { expect(blendedReturn([k('brokerage', { balance: 100000 }), k('hysa', { id: 'h', balance: 100000 })])).toBeCloseTo(0.061, 9); });
  test('complex · a rental counted in the nest egg, and in its rate', () => {
    const accounts = [k('401k', { id: 'a', balance: 412350 }), k('home', { id: 'r', re_use: 'rental', balance: 520000 }), k('hysa', { id: 'h', balance: 22416.73 })];
    expect(retirementEarmarkedValue(accounts)).toBeCloseTo(954766.73, 4);
    expect(blendedReturn(accounts)).toBeCloseTo(0.059614, 5);             // the formula as sent gave 7.71%, leaving the rental out of the rate but not the pot
  });
  test('complex · a quarter-earmarked brokerage, a 529 and an override', () => {
    expect(blendedReturn([k('401k', { id: 'a', balance: 238905.12 }), k('brokerage', { id: 'b', balance: 186420, retirement_pct: 25 }), k('529', { id: 'c', balance: 38200 })], { '401k': 0.065 })).toBeCloseTo(0.067449, 5);
  });
  test('edge · nothing earmarked', () => {
    expect(blendedReturn([k('529', { balance: 38200 }), k('home', { id: 'h', re_use: 'primary', balance: 650000 })])).toBeNull();   // REFUSES — the formula as sent gave 6%
  });
});

describe('MK-NW-F-039 buildAssetsState — five cases', () => {
  const A = (label: string, balance: number, target_return: number) => acct({ id: label, label, balance, target_return });
  test('easy · two accounts, shares and the blend', () => {
    const s = buildAssetsState('u', [A('A', 75000, 0.08), A('B', 25000, 0.04)]);
    expect([s.total_asset_value, s.accounts.map((a) => a.portfolio_percentage), s.average_target_return]).toEqual([100000, [75, 25], 0.07]);
  });
  test('easy · three shares', () => {
    const s = buildAssetsState('u', [A('a', 50000, 0.05), A('b', 30000, 0.05), A('c', 20000, 0.05)]);
    expect([s.total_asset_value, s.accounts.map((a) => a.portfolio_percentage)]).toEqual([100000, [50, 30, 20]]);
    expect(s.average_target_return).toBeCloseTo(0.05, 12);
  });
  test('complex · checking, a 401(k), a home and a car', () => {
    const s = buildAssetsState('u', [A('checking', 8412.66, 0.005), A('401k', 412350, 0.079), A('home', 650000, 0.045), A('car', 31850, -0.05)]);
    expect(s.total_asset_value).toBeCloseTo(1102612.66, 4);
    expect(s.accounts.map((a) => a.portfolio_percentage)).toEqual([0.762975, 37.397539, 58.950892, 2.888594].map((x) => expect.closeTo(x, 5)));
    expect(s.accounts.reduce((t, a) => t + a.portfolio_percentage, 0)).toBeCloseTo(100, 9);
    expect(s.average_target_return).toBeCloseTo(0.054666, 5);
  });
  test('complex · an overdrawn account beside savings', () => {
    const s = buildAssetsState('u', [A('checking', -250, 0.005), A('savings', 10250, 0.024)]);
    expect(s.total_asset_value).toBe(10000);
    expect(s.accounts.map((a) => a.portfolio_percentage)).toEqual([expect.closeTo(-2.5, 9), expect.closeTo(102.5, 9)]);
    expect(s.average_target_return).toBeCloseTo(0.024475, 9);
  });
  test('edge · nothing entered', () => {
    const s = buildAssetsState('u', []);
    expect([s.total_asset_value, s.accounts, s.average_target_return]).toEqual([0, [], null]);   // REFUSES — the formula as sent gave 7%
  });
});

describe('MK-NW-F-041 monthlyContributionsFromOnboarding — five cases', () => {
  const born = (age: number) => String(new Date().getFullYear() - age);
  test('easy · 401(k) and match', () => { expect(monthlyContributionsFromOnboarding({ c_401k: '1000', employerMatchMode: 'dollar', employerMatchValue: '500' })).toBe(1500); });
  test('easy · Roth and investing', () => { expect(monthlyContributionsFromOnboarding({ c_roth: '500', c_invest: '300' })).toBe(800); });
  test('complex · property saving is not a retirement contribution', () => {
    expect(monthlyContributionsFromOnboarding({ birthYear: born(58), c_401k: '1958.33', c_roth: '625', c_invest: '750', c_property: '400', employerMatchMode: 'dollar', employerMatchValue: '587.5' })).toBeCloseTo(3920.83, 6);   // the formula as sent gave $4,320.83
  });
  test('complex · entries above the 2026 limits for someone under 50', () => {
    const got = monthlyContributionsFromOnboarding({ birthYear: born(45), c_401k: '2500', c_roth: '700', employerMatchMode: 'dollar', employerMatchValue: '600' })!;
    expect(got).toBeCloseTo(2041.6667 + 700 + 600, 3);                    // the formula as sent gave $3,800: the 401(k) is held at $24,500 ÷ 12
    // HELD AT THE APP'S ANSWER for the Roth: its $625 holds the Roth answer at the IRA limit, but the setup question
    // says "Roth", not Roth IRA or Roth 401(k) — whose limits differ four-fold — so a Roth 401(k) saver would be cut
    // to $7,500 wrongly. The 401(k) answer IS a 401(k) and is held at its limit. Its $3,266.67 is not the app's.
    expect(got).not.toBeCloseTo(3266.6667, 3);
  });
  test('edge · onboarding not answered', () => { expect(monthlyContributionsFromOnboarding(null)).toBeNull(); });   // REFUSES — the formula as sent gave $0
});

describe('MK-NW-F-045 sourceWording — five cases', () => {
  const at = (iso: string) => new Date(iso).getTime();
  test('easy · hand-entered', () => { expect(sourceWording(acct({ source: 'manual' }))).toBe('By hand · you update it'); });
  test('easy · linked yesterday', () => { expect(sourceWording(acct({ source: 'connected', last_synced: '2026-10-03T12:00:00' }), at('2026-10-04T12:00:00'))).toBe('Linked'); });
  test('complex · linked exactly four days ago', () => {
    expect(sourceWording(acct({ source: 'connected', last_synced: '2026-09-30T12:00:00' }), at('2026-10-04T12:00:00'))).toBe('Linked · 4 days old');   // its "4 days ago" — the app's own words for an age
  });
  test('complex · imported with no update date on record', () => {
    expect(sourceWording(acct({ source: 'imported', last_synced: null }))).toBe('Imported · not updated yet');   // its "last update unknown" — no age is invented; the app's own words
  });
  test('edge · just under four days', () => { expect(sourceWording(acct({ source: 'connected', last_synced: '2026-09-30T13:00:00' }), at('2026-10-04T12:00:00'))).toBe('Linked'); });
});

describe('MK-NW-F-046 historyCoverage — five cases', () => {
  const TODAY = new Date('2026-10-04T12:00:00');
  const linked = (from: string | null) => acct({ source: 'connected', institution: 'Fidelity', history_from: from ?? undefined });
  test('easy · a hand-entered account', () => {
    const c = historyCoverage(acct({ source: 'manual', institution: 'Ally' }), '2025-10-04', TODAY)!;
    expect(c.kind).toBe('none'); expect(c.sentence).toMatch(/no activity records/);
  });
  test('easy · history reaches back far enough', () => { expect(historyCoverage(linked('2025-01-01'), '2025-10-04', TODAY)).toBeNull(); });
  test('complex · a one-year window, six months of history', () => {
    const c = historyCoverage(linked('2026-04-04'), '2025-10-04', TODAY)!;
    expect([c.kind, c.from, c.monthsCovered]).toEqual(['partial', '2026-04-04', 6]);
    expect(c.sentence).toMatch(/6 months/); expect(c.sentence).toMatch(/Apr 4, 2026/);
  });
  test('complex · a two-year window, eighteen months of history', () => {
    const c = historyCoverage(linked('2025-04-04'), '2024-10-04', TODAY)!;
    expect([c.kind, c.from, c.monthsCovered]).toEqual(['partial', '2025-04-04', 18]);
    expect(c.sentence).toMatch(/18 months|1 year 6 months/);                // the formula as sent said "2 years"
    expect(c.sentence).not.toMatch(/2 years/);
  });
  test('edge · history starts on the window’s first day', () => { expect(historyCoverage(linked('2025-10-04'), '2025-10-04', TODAY)).toBeNull(); });
});

describe('MK-NW-F-048 uberGroupRows — five cases', () => {
  const row = (key: string, total: number) => ({ key, label: key, color: '#000', total }) as any;
  const groups = (rows: any[]) => uberGroupRows(rows).map((g) => [g.group, g.total]);
  test('easy · only cash', () => { expect(groups([row('cash', 10000)])).toEqual([['cash', 10000]]); });
  test('easy · cash and two investment classes', () => {
    const g = uberGroupRows([row('cash', 8838), row('stocks_etf', 348495), row('bonds', 5819)]);
    expect(g.map((x) => [x.group, x.total])).toEqual([['cash', 8838], ['investments', 354314]]);
    expect(g[1].classes.map((c) => c.key)).toEqual(['stocks_etf', 'bonds']);
  });
  test('complex · the approved drawing grouped', () => {
    const g = groups([row('cash', 8838), row('stocks_etf', 348495), row('bonds', 5819), row('real_estate', 450000)]);
    expect(g).toEqual([['cash', 8838], ['investments', 354314], ['property', 450000]]);
    expect(g.reduce((t, x) => t + (x[1] as number), 0)).toBe(813152);
  });
  test('complex · all seven classes, Unclassified included', () => {
    const g = groups([row('cash', 22416.73), row('stocks_etf', 61880), row('bonds', 24685), row('alternatives', 4100), row('mixed', 212640.18), row('real_estate', 650000), row('personal_property', 31850)]);
    expect(g[0]).toEqual(['cash', 22416.73]);
    expect(g[1][1]).toBeCloseTo(303305.18, 6);
    expect(g[2]).toEqual(['property', 681850]);
    expect(g.reduce((t, x) => t + (x[1] as number), 0)).toBeCloseTo(1007571.91, 6);
  });
  test('edge · no class rows', () => { expect(uberGroupRows([])).toEqual([]); });
});

describe('MK-NW-F-051 itemizedResultTotal — five cases', () => {
  const items = (...values: number[]) => values.map((value, i) => ({ cls: 'stocks_etf', label: `H${i}`, value })) as any[];
  test('easy · the remainder kept as cash', () => { expect(itemizedResultTotal({ balance: 10000 }, items(6000, 3000))).toBe(10000); });
  test('easy · fully itemised', () => { expect(itemizedResultTotal({ balance: 10000 }, items(10000))).toBe(10000); });
  test('complex · part itemised: the total stays the entered total', () => {
    expect(itemizedResultTotal({ balance: 186442.19 }, items(124086.16, 23915.08))).toBeCloseTo(186442.19, 6);   // the formula as sent could fall to $148,001
  });
  test('complex · the holdings come to more than the lump', () => {
    // RULE UNCLEAR, its reading 2: the holdings at today's values are the truth. The screen shows the new total
    // ("the account total will update to $53,355") before the person taps Done — that tap is the confirmation.
    expect(itemizedResultTotal({ balance: 50000 }, items(31250.4, 22104.88))).toBeCloseTo(53355.28, 6);
  });
  test('edge · nothing itemised yet', () => { expect(itemizedResultTotal({ balance: 25000 }, [])).toBe(25000); });
});

describe('MK-NW-F-052 buildItemizedAccounts — five cases', () => {
  const lump = (over: Record<string, any>) => acct({ id: 'lump', institution: 'Fidelity', balance: 10000, ...over });
  test('easy · one stock named by its ticker', () => {
    const out = buildItemizedAccounts(lump({}), [{ cls: 'stocks_etf', label: '', ticker: 'VTI', value: 10000 }]);
    expect(out).toHaveLength(1);
    expect([out[0].label, out[0].institution, out[0].tax_bucket, out[0].balance, out[0].asset_class]).toEqual(['VTI', 'Fidelity', 'TAXABLE', 10000, 'stocks_etf']);
  });
  test('easy · a holding with no name', () => {
    const out = buildItemizedAccounts(lump({ institution: 'Coinbase', balance: 2000 }), [{ cls: 'alternatives', label: '', value: 2000 }]);
    expect([out[0].label, out[0].balance, out[0].asset_class]).toEqual(['Holding', 2000, 'alternatives']);
  });
  test('complex · a Treasury bought below face: no face value is invented', () => {
    const out = buildItemizedAccounts(lump({ institution: 'Schwab', balance: 9712.4 }), [{ cls: 'bonds', label: 'US Treasury 4.25% 2030', value: 9712.4, couponRate: 0.0425, maturityDate: '2030-08-15' }]);
    expect([out[0].label, out[0].balance, out[0].asset_class, out[0].coupon_rate, out[0].maturity_date]).toEqual(['US Treasury 4.25% 2030', 9712.4, 'bonds', 0.0425, '2030-08-15']);
    expect(out[0].face_value).toBeUndefined();                             // the formula as sent set it to today's value
  });
  test('complex · an IRA earmarked 40%, itemised with the cash kept', () => {
    const out = buildItemizedAccounts(lump({ institution: 'Schwab', tax_bucket: 'PRE_TAX', kind: 'trad_ira', retirement_pct: 40, balance: 60000 }),
      [{ cls: 'stocks_etf', label: '', ticker: 'VTI', value: 35000 }, { cls: 'stocks_etf', label: '', ticker: 'BND', value: 15000 }]);
    expect(out.map((a) => [a.label, a.balance, a.tax_bucket, a.retirement_pct])).toEqual([['VTI', 35000, 'PRE_TAX', 40], ['BND', 15000, 'PRE_TAX', 40], ['Schwab cash', 10000, 'PRE_TAX', 40]]);
    expect(out.reduce((t, a) => t + a.balance, 0)).toBe(60000);
    expect(retirementEarmarkedValue(out.map((a, i) => ({ ...a, asset_id: String(i) })) as any)).toBe(24000);   // the formula as sent let it jump to $60,000
  });
  test('edge · no remainder, so no cash account', () => {
    const out = buildItemizedAccounts(lump({ balance: 20000 }), [{ cls: 'stocks_etf', label: '', ticker: 'VTI', value: 12000 }, { cls: 'stocks_etf', label: '', ticker: 'VXUS', value: 8000 }]);
    expect(out.map((a) => [a.label, a.balance])).toEqual([['VTI', 12000], ['VXUS', 8000]]);
  });
});
