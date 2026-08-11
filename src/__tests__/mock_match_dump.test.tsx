// MOCK-MATCH HARNESS (founder standing order, 2026-08-10). Renders each screen with a realistic
// data shape and DUMPS every visible string in render order to /tmp/screen-dumps.json, so the audit
// diffs what the screen SHOWS against what the mock SHOWS — never a presence check again.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import { useStore } from '../store/useStore';
import { employedPartner } from '../testing/personas';

let mockParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn() },
  useSegments: () => [],
}));

const today = new Date().toISOString().slice(0, 10);
const REAL_DATA = {
  onboardingComplete: true,
  nwSeeded: true,
  nwSetupChoice: 'self',
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    // balance = the stocks (3,319 × $105 = $348,495) PLUS the $838 sweep cash the mock shows as its
    // own Cash row — so this fixture reproduces the approved mock's arithmetic exactly:
    // 8,000 + 838 + 348,495 + 5,819 + 450,000 = $813,152 − $418,000 = $395,152.
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 349333,
      target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 3319,
        lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Treasuries & CDs', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${today}T09:00:00Z`,
      maturity_date: '2026-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  // 2026-08-10: these two rows used `kind`/`balance`/`minimum_payment` — none of which are Debt
  // fields (they are `debt_type`/`remaining_balance`/`minimum_monthly_payment`). Every debt read as
  // $0, so the harness had been dumping a screen with no debts on it while claiming founder-shaped
  // data. Real field names now; the mortgage + card totals match the approved mock.
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
  transactions: [
    { account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1220, date: today },
    { account_id: 'etr', type: 'INTEREST', amount: 430, date: today },
  ],
  nwDaily: { '2026-08-03': 393042, [today]: 395152 },
  invDaily: { '2026-08-03': 361242, [today]: 363152 },
};

const dumpStrings = (): string[] => {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string') { const t = node.trim(); if (t) out.push(t); return; }
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  screen.toJSON() && walk(screen.toJSON());
  return out;
};

const SCREENS: { key: string; file: string; params?: any }[] = [
  { key: 'NW main', file: 'NetWorthScreen' },
  { key: 'Performance main', file: 'PerformanceScreen' },
  { key: 'Account detail (portfolio)', file: 'AccountDetailScreen', params: { id: 'van' } },
  { key: 'Account detail - class slice', file: 'AccountDetailScreen', params: { id: 'van', class: 'stocks_etf' } },
  { key: 'Account detail - matured CD', file: 'AccountDetailScreen', params: { id: 'etr' } },
  { key: 'Itemize', file: 'ItemizeScreen', params: { id: 'van' } },
  { key: 'Import holdings', file: 'ImportHoldingsScreen' },
  { key: 'Connect flow', file: 'ConnectFlowScreen' },
  { key: 'Add account', file: 'AddAccountScreen' },
  { key: 'Bond & alternatives editors', file: 'BondsScreen' },
];

const dumps: Record<string, string[]> = {};

describe('mock-match harness — dump every visible string per screen', () => {
  beforeEach(() => { useStore.getState().resetAll(); useStore.setState(REAL_DATA as any); });

  for (const s of SCREENS) {
    test(`dump: ${s.key}`, () => {
      mockParams = s.params ?? {};
      let Comp: any;
      try { Comp = require(`../screens/${s.file}`).default; } catch { dumps[s.key] = ['<screen not found>']; return; }
      try { render(<Comp />); dumps[s.key] = dumpStrings(); }
      catch (e: any) { dumps[s.key] = [`<render failed: ${String(e?.message ?? e).slice(0, 120)}>`]; }
      expect(dumps[s.key].length).toBeGreaterThan(0);
    });
  }

  afterAll(() => { fs.writeFileSync('/tmp/screen-dumps.json', JSON.stringify(dumps, null, 1)); });
});

// first-day states get their own dump — the founder's empty-state rule lives or dies here
describe('mock-match harness — first-day dumps', () => {
  test('dump: NW first-day + Performance day-one', () => {
    useStore.getState().resetAll();
    mockParams = {};
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const nw = dumpStrings();
    useStore.getState().resetAll();
    const PF = require('../screens/PerformanceScreen').default;
    render(<PF />);
    const pf = dumpStrings();
    const prev = fs.existsSync('/tmp/screen-dumps.json') ? JSON.parse(fs.readFileSync('/tmp/screen-dumps.json', 'utf8')) : {};
    fs.writeFileSync('/tmp/screen-dumps.json', JSON.stringify({ ...prev, ...dumps, 'NW first-day': nw, 'Performance day-one': pf }, null, 1));
    expect(nw.length + pf.length).toBeGreaterThan(0);
  });
});

// ── APPEARANCE AUDIT (founder standing order step 5, 2026-08-10) ──────────────────────────────
// Not a disclaimer any more: pull the RENDERED style values and check them against the mock's.
describe('appearance audit — rendered styles, not stylesheet definitions', () => {
  const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));

  beforeEach(() => { useStore.getState().resetAll(); useStore.setState(REAL_DATA as any); mockParams = {}; });

  test('band colours: deep-green bands with white caps; sub-bands light with deep-green text', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const own = screen.getByText('WHAT YOU OWN');
    expect(flat(own).color).toBe('#FFFFFF');
    expect(flat(own).textTransform).toBe('uppercase');
    const cash = screen.getAllByText(/💵/)[0];
    expect(flat(cash).color).toBe('#085041');            // sub-band text is deep green, never white
  });

  test('font sizes are on the design scale everywhere that renders', () => {
    const SCALE = [11, 13, 15, 17, 20, 24, 30, 38];
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const bad: string[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      if (n.props?.style) { const f = flat(n).fontSize; if (f && !SCALE.includes(f)) bad.push(`${f}`); }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    expect(bad).toEqual([]);
  });

  test('THE SHARED RIGHT EDGE: a band total and a row value resolve to the same right inset', () => {
    const { SectionBand } = require('../components/SectionBand');
    const { Spacing } = require('../utils/theme');
    render(<SectionBand inCard title="WHAT YOU OWN" value="$813,152" />);
    const v = screen.getByText('$813,152');
    // the band bleeds by -inset and the value adds the same inset back, so it lands on the rows' edge
    expect(flat(v).marginRight).toBe(Spacing.md);
  });

  test('donut: slices follow the fixed validated palette, in the fixed class order', () => {
    const { ClassMarkColors } = require('../utils/theme');
    expect(ClassMarkColors.cash).toBe('#1baf7a');
    expect(ClassMarkColors.stocks_etf).toBe('#2a78d6');
    expect(ClassMarkColors.bonds).toBe('#4a3aa7');
    expect(ClassMarkColors.real_estate).toBe('#eda100');
  });

  test('nesting: no class header repeats its own group name (founder gap 3)', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const cashHeaders = screen.queryAllByText('Cash');     // the plain class header, not the group bar
    expect(cashHeaders.length).toBe(0);
  });

  test('order: the grouping pills render BEFORE the WHAT YOU OWN band (founder gap 5)', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const strings = dumpStrings();
    expect(strings.indexOf('By category')).toBeLessThan(strings.indexOf('WHAT YOU OWN'));
    expect(strings.indexOf('By category')).toBeGreaterThan(-1);
  });

  // ── the Quiet-Instrument rebuild, 2026-08-10 ────────────────────────────────────────────────
  // THE right edge, measured on the real screen rather than on a component in isolation: a section
  // total, a group total, a class total and an account amount must all resolve to the same inset.
  test('THE SHARED RIGHT EDGE, on the built screen: section, group, class and account amounts agree', () => {
    const NW = require('../screens/NetWorthScreen').default;
    const { Spacing } = require('../utils/theme');
    render(<NW />);
    const ARROW = 16;
    // a band total clears the row inset AND the arrow column the rows reserve
    expect(flat(screen.getByText('$813,152')).marginRight).toBe(ARROW);      // WHAT YOU OWN
    expect(flat(screen.getByText('$354,314')).marginRight).toBe(ARROW);      // the INVESTMENTS group bar
    expect(flat(screen.getByText('−$418,000')).marginRight).toBe(ARROW);     // WHAT YOU OWE
    // and the rows themselves sit at that inset with a real arrow in the same column
    const row = screen.getByText('$348,495');                                // a class total inside a group
    const arrows = screen.getAllByText('›');
    expect(flat(row).marginRight ?? 0).toBe(0);
    expect(flat(arrows[0]).width).toBe(ARROW);
    expect(flat(arrows[0]).textAlign).toBe('right');
    expect(Spacing.md).toBe(12);                                             // the ledger's row inset
  });

  // Founder 2026-08-11: today's date rides the title bar again — it stamps when the numbers were
  // true. The "since" line keeps naming the day the CHANGE is measured from; two different facts,
  // never the same date twice. The hero still ends there — no trend line under it.
  test('the hero title carries today, the since line carries the measured-from day, and no trend line follows', () => {
    const Svg = require('react-native-svg');
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    expect(screen.getByText(`YOUR NET WORTH · ${today}`)).toBeOnTheScreen();
    expect(screen.getByText(/^since /)).toBeOnTheScreen();
    const strings = dumpStrings();
    expect(strings.filter((s) => s.includes(today)).length).toBe(1);      // today is stamped ONCE
    expect(screen.UNSAFE_queryAllByType(Svg.Polyline).length).toBe(0);
  });

  // Founder 2026-08-11: the hero and the retirement plan wear the SAME full-width green banner as
  // WHAT YOU OWN. Measured from the rendered nodes, not from the stylesheet: every banner must have
  // the one deep-green background and must NOT be pulled inward or bled out with side margins.
  test('every section banner is the same full-width green bar — hero and retirement plan included', () => {
    const { Colors } = require('../utils/theme');
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const titles = ['YOUR NET WORTH', 'YOUR RETIREMENT PLAN', 'WHAT YOU OWN', 'WHAT YOU OWE', 'EMERGENCY CUSHION'];
    const bands: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      if (n.props?.style) {
        const st = flat(n);
        if (st.backgroundColor === Colors.primaryDeep && st.flexDirection === 'row') bands.push(st);
      }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    expect(bands.length).toBe(titles.length);              // one banner per section, no more, no fewer
    for (const b of bands) {
      expect(b.marginHorizontal ?? 0).toBe(0);             // never inset, never bled — flush to both edges
      expect(b.alignSelf).toBe('stretch');
      expect(b.paddingHorizontal).toBe(12);                // and all five share one text inset
    }
    // the banner texts themselves are the app's white caps
    for (const t of titles) {
      const node = t === 'YOUR NET WORTH' ? screen.getByText(new RegExp(`^${t}`)) : screen.getByText(t);
      expect(flat(node).color).toBe('#FFFFFF');
      expect(flat(node).textTransform).toBe('uppercase');
    }
  });

  test('the change line names both halves and colours only a fall in amber', () => {
    const { Colors } = require('../utils/theme');
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const line = screen.getByText(/Change in net worth/);
    expect(line.props.children.join('')).toMatch(/Change in net worth \+\$2,110 · Return on cash \+ investments \+0\.5%/);
    expect(flat(line).color).toBe(Colors.gainText);      // up (and $0) is green; amber is only for a fall
  });

  // Founder decisions 2026-08-11 (audit Q2 + Q6): the composition bar replaces the donut, what you
  // owe gets its own bar, and categories read biggest first — in the bar and the list alike.
  test('the composition bar names every slice with its percent — colour is never the only signal', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const strings = dumpStrings();
    const own = strings.indexOf('WHAT YOU OWN');
    const owe = strings.indexOf('WHAT YOU OWE');
    // assets legend, biggest first, immediately under the section total
    expect(strings.slice(own, owe).join(' ')).toMatch(/Real estate 55 % Stocks \/ ETFs 43 % Cash 1 % Bonds & CDs 1 %/);
    // debts get the same shape in the warning family
    expect(strings.slice(owe).join(' ')).toMatch(/Home mortgage 99 % Chase Visa 1 %/);
    // and the donut's centre content is gone with it
    expect(screen.queryByText('Assets')).toBeNull();
  });

  test('categories read BIGGEST FIRST inside a group, matching the bar above them', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const s = dumpStrings();
    const inv = s.indexOf('▾ 📈 Investments');
    const rest = s.slice(inv);
    expect(rest.indexOf('Stocks / ETFs')).toBeLessThan(rest.indexOf('Bonds & CDs'));   // 348,495 before 5,819
  });

  test('the cushion carries its own progress bar, and it is never the only signal', () => {
    const { Colors } = require('../utils/theme');
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    const fills: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      const st = n.props?.style ? flat(n) : null;
      if (st && typeof st.width === 'string' && st.backgroundColor === Colors.amber) fills.push(st);
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    expect(fills.length).toBeGreaterThan(0);                       // 2.0 of 6 months → an amber part-bar
    expect(fills[fills.length - 1].width).toBe('33.33333333333333%');
    expect(screen.getByText('Tight ⚠')).toBeOnTheScreen();         // the word carries it too
  });

  test('the cash-flow glance is gone from this screen (founder Q3)', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    expect(screen.queryByText("This month's cash flow")).toBeNull();
    expect(screen.getByText('＋ Add or connect an account')).toBeOnTheScreen();   // the add door stays
  });

  test('first day: the grouping buttons are there, and By institution says what it will hold', () => {
    const { fireEvent } = require('@testing-library/react-native');
    useStore.getState().resetAll();
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    expect(screen.getByText('By category')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText(/Group what you own by institution/));
    expect(screen.getByText(/Your banks and brokerages will be listed here/)).toBeOnTheScreen();
    expect(screen.queryByText('💵 CASH')).toBeNull();               // no invented $0 banks either
  });

  test('data reality: a connected CD/Treasuries account reads as Bonds & CDs, never Unclassified', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    expect(screen.getAllByText(/Bonds & CDs/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Unclassified')).toBeNull();
  });

  test('the cushion divides by the SAME cash the CASH group shows (one number, two places)', () => {
    const NW = require('../screens/NetWorthScreen').default;
    render(<NW />);
    expect(screen.getByText('$8,838')).toBeOnTheScreen();                    // the CASH group total
    const strings = dumpStrings();
    const math = strings.indexOf('of essentials covered by your cash —');
    expect(strings[math + 1]).toBe('$8,838');                                // and the cushion divides the same figure
    expect(strings[strings.indexOf('months') - 1]).toBe('2.0');              // 8,838 ÷ 4,500 = 2.0, not 1.8
  });
});
