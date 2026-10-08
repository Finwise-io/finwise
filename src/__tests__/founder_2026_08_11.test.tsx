// FOUNDER FINDINGS + RULES, 2026-08-11 (device review of build 51 + the naming decision).
// One test per thing asked for, each named so a failure says which promise broke.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import { accountDisplayName, accountDisplayNames, accountLastFour } from '../domain/assets';
import { dataGaps } from '../domain/gaps';
import { isoLocalDate } from '../domain/_shared/dates';

const mockSync = jest.fn();
jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: (...a: any[]) => mockSync(...a) }));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { push: jest.fn() },
}));

beforeEach(() => { useStore.getState().resetAll(); mockParams = {}; });

// ── (2) THE GREEN TITLE BARS ARE SQUARE, EVERYWHERE ────────────────────────────────────────────
test('every green section banner has square corners — one component, so it holds on all screens', () => {
  const { SectionBand } = require('../components/SectionBand');
  const { Colors } = require('../utils/theme');
  const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
  render(<SectionBand title="WHAT YOU OWN" value="$813,152" />);
  // find the band by its RENDERED background, not by guessing at the tree shape
  const bands: any[] = [];
  const walk = (n: any) => {
    if (!n || typeof n === 'string') return;
    if (n.props?.style && flat(n).backgroundColor === Colors.primaryDeep) bands.push(flat(n));
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  expect(bands).toHaveLength(1);
  const st = bands[0];
  expect(st.borderTopLeftRadius).toBe(0);
  expect(st.borderTopRightRadius).toBe(0);
  expect(st.borderBottomLeftRadius ?? 0).toBe(0);
  expect(st.borderBottomRightRadius ?? 0).toBe(0);
});

// ── (3) THE ONE ACCOUNT-NAMING RULE: institution + last four ───────────────────────────────────
// THE NAMING RULE (founder, 2026-08-11 — recorded in the PRD's Amendments tab):
//   taxable        → institution + last four   · no digits → institution + wrapper
//   tax-advantaged → institution + wrapper + last four (the wrapper IS the tax treatment)
//   duplicates     → a trailing · 1 / · 2
test('TAXABLE: institution + last four — never the broker\'s own wording', () => {
  expect(accountDisplayName({
    label: 'Kamala Kavadia Brokerage', institution: 'Vanguard', mask: '••5738', tax_bucket: 'TAXABLE', kind: 'brokerage',
  } as any)).toBe('Vanguard -5738');
  // an account number works as well as a mask, and only the last FOUR are ever shown
  expect(accountDisplayName({ label: 'Whatever', institution: 'Chase', account_number: '1234567890', tax_bucket: 'TAXABLE' } as any))
    .toBe('Chase -7890');
});

test('TAXABLE with no digits: institution + the ACCOUNT word (Brokerage / Checking / Savings)', () => {
  const n = (over: any) => accountDisplayName({ label: 'Kamala Kavadia Brokerage', institution: 'Vanguard', tax_bucket: 'TAXABLE', ...over } as any);
  expect(n({ kind: 'brokerage' })).toBe('Vanguard Brokerage');
  // a kind that describes the HOLDINGS still names the account it sits in
  expect(n({ kind: 'stocks_etf' })).toBe('Vanguard Brokerage');
  expect(n({ kind: 'crypto' })).toBe('Vanguard Brokerage');
  expect(accountDisplayName({ label: 'x', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH' } as any)).toBe('Chase Checking');
  expect(accountDisplayName({ label: 'x', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH' } as any)).toBe('Ally Savings');
});

test('TAX-ADVANTAGED: the wrapper ALWAYS shows — it is the tax treatment', () => {
  expect(accountDisplayName({ label: 'K K Roth', institution: 'Vanguard', kind: 'roth_ira', tax_bucket: 'ROTH', mask: '••5738' } as any))
    .toBe('Vanguard Roth IRA -5738');
  expect(accountDisplayName({ label: 'K K 401k', institution: 'Fidelity', kind: '401k', tax_bucket: 'PRE_TAX' } as any))
    .toBe('Fidelity 401(k)');
  expect(accountDisplayName({ label: 'health', institution: 'Fidelity', kind: 'hsa', tax_bucket: 'PRE_TAX', mask: '••2210' } as any))
    .toBe('Fidelity HSA -2210');
  expect(accountDisplayName({ label: 'ira', institution: 'Vanguard', kind: 'trad_ira', tax_bucket: 'PRE_TAX' } as any))
    .toBe('Vanguard Traditional IRA');
});

test('two accounts that still read the same get a 1 and a 2', () => {
  const names = accountDisplayNames([
    { asset_id: 'a', label: 'One', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE' },
    { asset_id: 'b', label: 'Two', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE' },
  ] as any);
  expect([...names.values()].sort()).toEqual(['Vanguard Brokerage · 1', 'Vanguard Brokerage · 2']);
  // two Roth IRAs at one firm, neither sharing digits, are still tellable apart
  const roths = accountDisplayNames([
    { asset_id: 'r1', label: 'A', institution: 'Vanguard', kind: 'roth_ira', tax_bucket: 'ROTH' },
    { asset_id: 'r2', label: 'B', institution: 'Vanguard', kind: 'roth_ira', tax_bucket: 'ROTH' },
  ] as any);
  expect(new Set(roths.values()).size).toBe(2);
});

test('two accounts at one firm read differently — the founder\'s duplicate-banner bug', () => {
  const names = accountDisplayNames([
    { asset_id: 'v1', label: 'Kamala Kavadia Brokerage', institution: 'Vanguard', mask: '••5738' },
    { asset_id: 'v2', label: 'Kamala Kavadia Roth IRA', institution: 'Vanguard', mask: '••1129' },
  ] as any);
  expect(names.get('v1')).toBe('Vanguard -5738');
  expect(names.get('v2')).toBe('Vanguard -1129');
  expect(new Set(names.values()).size).toBe(2);
});

test('digits we do not really have are never invented as "your last four"', () => {
  // E*TRADE relays a scrambled id through SnapTrade — its tail is not the account number
  expect(accountLastFour({ mask: '••••9Cmw' } as any)).toBeNull();
  expect(accountLastFour({} as any)).toBeNull();
  expect(accountLastFour({ mask: '••4821' })).toBe('4821');
});

test('the missing-data banner names each account, so two Vanguard rows are not identical lines', () => {
  const NOW = Date.parse('2026-08-11T12:00:00Z');
  const stale = '2026-08-03T09:00:00Z';
  const gaps = dataGaps([
    { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', mask: '••5738', source: 'connected', last_synced: stale, tax_bucket: 'TAXABLE', balance: 1, target_return: 0 },
    { asset_id: 'v2', label: 'Roth IRA', institution: 'Vanguard', mask: '••1129', source: 'connected', last_synced: stale, tax_bucket: 'ROTH', balance: 1, target_return: 0 },
  ] as any, null, NOW, []);
  const titles = gaps.filter((g) => g.kind === 'stale-account').map((g) => g.title);
  expect(titles).toHaveLength(2);
  expect(new Set(titles).size).toBe(2);                       // the founder saw the SAME line twice
  expect(titles[0]).toMatch(/Vanguard -5738 last updated Aug 3/);
  expect(titles[1]).toMatch(/Vanguard Roth -1129 last updated Aug 3/);   // a Roth with no kind says Roth (second-round review, 2026-10-07; DEC-0083: a tax-advantaged account shows what it is)
});

// ── (1) "SYNC NOW" ACTUALLY SYNCS, AND A DEAD CONNECTION SAYS SO ───────────────────────────────
test('"Sync now" is an action, not a link to a page that cannot sync', () => {
  const NOW = Date.parse('2026-08-11T12:00:00Z');
  const [gap] = dataGaps([
    { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', mask: '••5738', source: 'connected', last_synced: '2026-08-03T09:00:00Z', tax_bucket: 'TAXABLE', balance: 1, target_return: 0 },
  ] as any, null, NOW, []);
  expect(gap.fixLabel).toBe('Sync now');
  expect(gap.action).toBe('sync');            // the button RUNS the sync — it used to only navigate
});

test('an account the sync could NOT reach says so, and offers Link again instead of another sync', () => {
  const NOW = Date.parse('2026-08-11T12:00:00Z');
  const accounts = [
    { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', mask: '••5738', source: 'connected', last_synced: '2026-08-03T09:00:00Z', tax_bucket: 'TAXABLE', balance: 1, target_return: 0 },
  ] as any;
  const failures = [{ accountId: 'v1', at: '2026-08-11T11:00:00Z', reason: 'connection expired' }];
  const gaps = dataGaps(accounts, null, NOW, [], failures);
  const g = gaps.find((x) => x.kind === 'unreachable-account')!;
  expect(g.title).toBe("We couldn't reach Vanguard -5738");
  expect(g.fixLabel).toBe('Link again');   // founder 2026-09-14: linked / link again
  expect(g.action).toBe('reconnect');
  expect(g.meanwhile).toMatch(/we don't guess at newer ones/);
  // and it REPLACES the plain stale line — one row per problem, never two for the same account
  expect(gaps.some((x) => x.kind === 'stale-account')).toBe(false);
});

test('a fixed connection stops complaining — no failure recorded, no unreachable row', () => {
  const NOW = Date.parse('2026-08-11T12:00:00Z');
  const gaps = dataGaps([
    { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', mask: '••5738', source: 'connected', last_synced: '2026-08-11T09:00:00Z', tax_bucket: 'TAXABLE', balance: 1, target_return: 0 },
  ] as any, null, NOW, [], []);
  expect(gaps).toHaveLength(0);
});

test('the fix-it sheet runs the sync in place and says what happened', async () => {
  mockSync.mockResolvedValue(1);                 // ONE account actually refreshed
  const { DataGapsBanner } = require('../components/DataGapsBanner');
  render(<DataGapsBanner gaps={[{
    kind: 'stale-account', accountId: 'v1', title: 'Vanguard -5738 last updated Aug 3',
    meanwhile: 'Balances may have moved.', fixLabel: 'Sync now', route: '/account-detail?id=v1', action: 'sync',
  }]} />);
  fireEvent.press(screen.getByText(/1 number needs more information/));
  await fireEvent.press(screen.getByLabelText(/Sync now\. Updates this account now\./));
  expect(mockSync).toHaveBeenCalledWith({ force: true });
  expect(await screen.findByText(/Updated 1 account\./)).toBeOnTheScreen();
});

// FOUNDER FINDING 2026-08-11: the sheet said "Updated" even when NOTHING had been refreshed, and the
// rows stayed exactly where they were — a claim of success contradicted by the screen itself.
test('when nothing could be refreshed, the sheet says SO — it never claims an update it did not make', async () => {
  mockSync.mockResolvedValue(0);                 // the broker answered with nothing
  const { DataGapsBanner } = require('../components/DataGapsBanner');
  render(<DataGapsBanner gaps={[{
    kind: 'stale-account', accountId: 'v1', title: 'Vanguard -5738 last updated Aug 3',
    meanwhile: 'Balances may have moved.', fixLabel: 'Sync now', route: '/account-detail?id=v1',
    action: 'sync', alt: { label: 'Link again', route: '/connect' },
  }]} />);
  fireEvent.press(screen.getByText(/1 number needs more information/));
  await fireEvent.press(screen.getByLabelText(/Sync now\. Updates this account now\./));
  expect(await screen.findByText(/Nothing could be refreshed/)).toBeOnTheScreen();
  expect(screen.queryByText(/^Updated/)).toBeNull();
});

test('there is always a way to link it again — "link it again" is never advice with no door', () => {
  const { dataGaps } = require('../domain/gaps');
  const NOW = Date.parse('2026-08-11T12:00:00Z');
  const [stale] = dataGaps([
    { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', mask: '••5738', source: 'connected', last_synced: '2026-08-03T09:00:00Z', tax_bucket: 'TAXABLE', balance: 1, target_return: 0 },
  ] as any, null, NOW, []);
  expect(stale.alt).toEqual({ label: 'Link again', route: '/connect' });
  const { DataGapsBanner } = require('../components/DataGapsBanner');
  render(<DataGapsBanner gaps={[stale]} />);
  fireEvent.press(screen.getByText(/1 number needs more information/));
  expect(screen.getByLabelText(/Link again — link this account again/)).toBeOnTheScreen();
});

// ── MEASURED VOLATILITY (founder ask 2026-08-11: "where are we getting assumptions?") ───────────
test('a portfolio\'s risk is MEASURED from what it holds, not derived from its return', () => {
  const { blendedVolatility, blendedReturn, KIND_VOLATILITY, VOLATILITY_META } = require('../domain/assets');
  // retirement_pct forces the cash into the pot — by default cash is emergency money, not nest egg
  const cashy = [{ asset_id: 'c', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 100000, target_return: 0, retirement_pct: 100 }] as any;
  const stocky = [{ asset_id: 's', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 100000, target_return: 0 }] as any;
  // the old rule (return × 1.7, floored at 5%) called a savings account 5% volatile. It is not.
  expect(blendedVolatility(cashy)).toBeLessThan(0.02);
  expect(blendedVolatility(stocky)).toBe(KIND_VOLATILITY.stocks_etf);
  // a 50/50 mix sits between its parts, weighted by the money — same weighting the return uses
  const mixed = [...cashy, ...stocky];
  const v = blendedVolatility(mixed);
  expect(v).toBeGreaterThan(blendedVolatility(cashy));
  expect(v).toBeLessThan(blendedVolatility(stocky));
  expect(blendedReturn(mixed)).toBeGreaterThan(0);            // the pair describes ONE portfolio
  // every figure that is an estimate rather than a measured series says so, like the returns do
  expect(VOLATILITY_META.stocks_etf.source).toMatch(/S&P 500/);
  expect(VOLATILITY_META.crypto.estimate).toBe(true);
});

// ── SAMPLE + ASK when the verdict cannot be computed ────────────────────────────────────────────
test('the ask names the missing answers — one, two or all three', () => {
  const { sampleAskLine } = require('../domain/planning/hub');
  expect(sampleAskLine(['what you spend']))
    .toBe('a sample, not your number — add what you spend and it becomes yours');
  expect(sampleAskLine(['your age', 'what you spend']))
    .toBe('a sample, not your number — 2 answers make it yours: your age and what you spend');
  expect(sampleAskLine(['your age', 'what you spend', 'what you have']))
    .toBe('a sample, not your number — 3 answers make it yours: your age, what you spend and what you have');
  expect(sampleAskLine([])).toBe('');
});

test('a plan missing ONE answer shows the labelled sample and names it — never a bare "See your plan"', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    // age ✔ and savings ✔, but nothing captured about spending
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 55), targetRetirementAge: '67' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000, target_return: 0.07 }],
    nwSetupChoice: 'self',
  } as any);
  const NetWorthScreen = require('../screens/NetWorthScreen').default;
  render(<NetWorthScreen />);
  expect(screen.getByText(/Sample: 84%/)).toBeOnTheScreen();
  expect(screen.getByText(/odds of lasting to age 90/)).toBeOnTheScreen();
  expect(screen.getByText(/add what you spend and it becomes yours/)).toBeOnTheScreen();
  expect(screen.queryByText('See your plan ›')).toBeNull();
  // the sample is ALWAYS labelled — a sample figure and a real verdict never mix
  expect(screen.queryByText(/retire at \d+ with/)).toBeNull();
});

test('the one app-wide sample is one constant — Home and Net worth cannot drift apart', () => {
  const { SAMPLE_CHANCE, SAMPLE_HORIZON } = require('../domain/planning/hub');
  expect(SAMPLE_CHANCE).toBe(84);
  expect(SAMPLE_HORIZON).toBe(90);
});

// ── (1) THE BAR FOLLOWS THE TOGGLE ─────────────────────────────────────────────────────────────
test('the composition bar regroups by institution when you switch tabs', () => {
  useStore.setState({
    nwSeeded: true, hideBalances: false,
    assetAccounts: [
      { asset_id: 'c1', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 20000, target_return: 0 },
      { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 80000, target_return: 0.07 },
    ],
    liabilities: [],
  } as any);
  const NetWorthScreen = require('../screens/NetWorthScreen').default;
  render(<NetWorthScreen />);
  expect(screen.getByLabelText(/What you own by category: /)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/Group what you own by institution/));
  // the SAME money, regrouped the way the list beneath it is now grouped
  const bar = screen.getByLabelText(/What you own by institution: /);
  expect(bar).toBeOnTheScreen();
  expect(bar.props.accessibilityLabel).toMatch(/Vanguard 80 percent/);
  expect(bar.props.accessibilityLabel).toMatch(/Chase 20 percent/);
  expect(screen.queryByLabelText(/What you own by category: /)).toBeNull();
});

// ── (2) THE SUB-LINE COUNTS WHAT IS THERE INSTEAD OF REPEATING THE CLASS ───────────────────────
test('the line under an account counts its holdings — it no longer repeats the class name', () => {
  const { classPortionLabel } = require('../domain/assets');
  const acct = (positions: any[], extra: any = {}) => ({ asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1, target_return: 0, positions, ...extra });
  // bonds: the CDs and the Treasuries are counted separately, as the founder asked
  expect(classPortionLabel(acct([
    { ticker: 'CD1', name: 'CHASE CD 4.2% 2027', asset_class: 'bond' },
    { ticker: 'CD2', name: 'ALLY CERTIFICATE OF DEPOSIT', asset_class: 'bond' },
    { ticker: 'CD3', name: 'KEY BANK CD 3.85%', asset_class: 'bond' },
    { ticker: 'T1', name: 'US TREASURY NOTE 4% 2032', asset_class: 'bond' },
  ]), 'bonds')).toBe('3 CDs & 1 Treasury in this account');
  // one of each reads in the singular
  expect(classPortionLabel(acct([
    { ticker: 'CD1', name: 'CHASE CD', asset_class: 'bond' },
    { ticker: 'T1', name: 'TREASURY BILL', asset_class: 'bond' },
  ]), 'bonds')).toBe('1 CD & 1 Treasury in this account');
  // shares: a ticker cannot tell a share from a fund, so ONE honest word covers both — never a guess
  expect(classPortionLabel(acct([
    { ticker: 'VTI', asset_class: 'stock_etf' }, { ticker: 'AAPL', asset_class: 'stock_etf' },
  ]), 'stocks_etf')).toBe('2 holdings in this account');
  // cash: one account, one cash line — said plainly. Cash is CASH ONLY (founder rule 2026-08-04),
  // so a money-market fund is never named here: it belongs to Stocks / Funds, where its dividends
  // are measured.
  expect(classPortionLabel(acct([]), 'cash')).toBe('cash in this account');
  expect(classPortionLabel(acct([{ ticker: 'VMFXX', name: 'VANGUARD MONEY MARKET', asset_class: 'cash' }]), 'cash'))
    .toBe('cash in this account');
});

// ── (3) THE DEBT BAR IS READABLE WITHOUT COLOUR VISION ─────────────────────────────────────────
test('debt segments are told apart by LIGHTNESS, not hue — colour blindness cannot collapse them', () => {
  const { DebtRamp } = require('../utils/theme');
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ls = DebtRamp.map(lum);
  // strictly increasing lightness, each step clearly separated — this is what makes it readable
  for (let i = 1; i < ls.length; i++) {
    expect(ls[i]).toBeGreaterThan(ls[i - 1]);
    const contrast = (ls[i] + 0.05) / (ls[i - 1] + 0.05);
    expect(contrast).toBeGreaterThan(1.7);                 // adjacent steps never read as one tone
  }
  // and the old pairing is gone: red beside amber is exactly what red-green blindness merges
  const { Colors } = require('../utils/theme');
  expect(DebtRamp).not.toContain(Colors.red);
});

// ── CASH MEANS CASH ONLY — at the LIVE classification point, not just in the migration ──────────
test('a money-market or CD position lands in the right class the moment it syncs', () => {
  const { accountClassBreakdown } = require('../domain/assets');
  // exactly what a broker sends: it tags both of these 'cash'. The NAME decides, not the tag.
  const b = accountClassBreakdown({
    asset_id: 'st-x', source: 'connected', balance: 100000, cash_balance: 10000,
    positions: [
      { position_id: 'p1', ticker: 'VMFXX', name: 'VANGUARD FEDERAL MONEY MARKET', asset_class: 'cash', last_price: 1, lots: [{ shares: 50000, cost_per_share: 1 }] },
      { position_id: 'p2', ticker: 'CD1', name: 'ALLY BANK CD 4.2% 2027', asset_class: 'cash', last_price: 1, lots: [{ shares: 40000, cost_per_share: 1 }] },
    ],
  } as any)!;
  expect(b.stocks_etf).toBe(50000);      // money-market fund pays dividends → Stocks / Funds
  expect(b.bonds).toBe(40000);           // the CD pays interest → Bonds & CDs
  expect(b.cash).toBe(10000);            // only the sweep sleeve is cash
  expect(Object.values(b).reduce((t: number, v: any) => t + v, 0)).toBe(100000);   // still exact
});

test('a money-market fund sent as a BARE TICKER is still not cash (the founder\'s VMFXX case)', () => {
  const { incomeBearingClassOf, accountClassBreakdown } = require('../domain/assets');
  // the name rule has no words to match on a ticker — the symbol list covers it
  expect(incomeBearingClassOf('VMFXX')).toBe('stocks_etf');
  expect(incomeBearingClassOf('SPAXX')).toBe('stocks_etf');
  expect(incomeBearingClassOf('SWVXX')).toBe('stocks_etf');
  expect(incomeBearingClassOf('VTI')).toBeNull();          // an ordinary fund is left alone
  const b = accountClassBreakdown({
    asset_id: 'st-y', source: 'connected', balance: 60000, cash_balance: 10000,
    positions: [{ position_id: 'p1', ticker: 'VMFXX', asset_class: 'cash', last_price: 1, lots: [{ shares: 50000, cost_per_share: 1 }] }],
  } as any)!;
  expect(b.cash).toBe(10000);                              // sweep only
  expect(b.stocks_etf).toBe(50000);
});

// ── ACCOUNT DETAIL: income belongs to the holding the SOURCE named, never to a guess ────────────
test('untickered income is not pinned onto every holding — a CD never shows "dividends"', () => {
  const acct = {
    asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage',
    tax_bucket: 'TAXABLE', balance: 224690, target_return: 0.05, source: 'connected', cash_balance: 500,
    last_synced: new Date().toISOString(),
    positions: [
      { position_id: 'p1', ticker: 'CD1', name: 'ALLY BANK CD 4.2% 2027', asset_class: 'bond', last_price: 1, lots: [{ shares: 112095, cost_per_share: 1 }] },
      { position_id: 'p2', ticker: 'CD2', name: 'CHASE CD 4.0% 2028', asset_class: 'bond', last_price: 1, lots: [{ shares: 112095, cost_per_share: 1 }] },
    ],
  };
  useStore.setState({
    assetAccounts: [acct],
    // the broker sent income with NO ticker — it cannot be attributed to either CD
    transactions: [
      { id: 't1', account_id: 'van', type: 'DIVIDEND', amount: 16907, date: '2026-03-01' },
      { id: 't2', account_id: 'van', type: 'INTEREST', amount: 10787, date: '2026-04-01' },
    ],
  } as any);
  mockParams = { id: 'van' };
  const AccountPortfolioScreen = require('../screens/AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  // the whole-account Income figure still counts it — the money is real and is not hidden
  expect(screen.getAllByText('$27,694').length).toBeGreaterThan(0);   // the balance: trio, account row and Total row
  // …but no holding row claims it, and no CD is ever shown paying dividends
  expect(screen.queryByText(/\$16,907 dividends/)).toBeNull();
  expect(screen.queryByText(/Income: .*dividends/)).toBeNull();
});

test('the activity list is newest-first, so recent income is never pushed off the visible eight', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `old${i}`, account_id: 'van', type: 'DEPOSIT', amount: 100, date: `2025-${String((i % 12) + 1).padStart(2, '0')}-02`,
  }));
  useStore.setState({
    assetAccounts: [{ asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0 }],
    // the newest row is a dividend, stored LAST — it used to fall past the eight-row cut
    transactions: [...many, { id: 'div', account_id: 'van', type: 'DIVIDEND', amount: 250, date: '2026-08-01' }],
  } as any);
  mockParams = { id: 'van' };
  const AccountPortfolioScreen = require('../screens/AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('08-01')).toBeOnTheScreen();        // the 2026 dividend, newest, is visible
  // 2026-08-11: each row now also says WHOSE fact it is — the broker's or yours
  expect(screen.getByLabelText(/2026-08-01: Dividend, plus \$250\. You entered this — editable\./)).toBeOnTheScreen();
});

// ── THE LEFTOVER IS CASH, NOT MORE OF THE BIGGEST HOLDING ──────────────────────────────────────
test('uninvested money in a CD-heavy account counts as CASH, never as more CDs', () => {
  const { accountClassBreakdown } = require('../domain/assets');
  // the broker says the account is worth $224,690; its holdings account for $224,190
  const b = accountClassBreakdown({
    asset_id: 'st-cd', source: 'connected', balance: 224690,
    positions: [
      { position_id: 'p1', ticker: 'CD1', name: 'ALLY CD 4.2%', asset_class: 'bond', last_price: 1, lots: [{ shares: 112095, cost_per_share: 1 }] },
      { position_id: 'p2', ticker: 'CD2', name: 'CHASE CD 4.0%', asset_class: 'bond', last_price: 1, lots: [{ shares: 112095, cost_per_share: 1 }] },
    ],
  } as any)!;
  expect(b.bonds).toBe(224190);        // exactly the CDs the broker itemised — not a penny more
  expect(b.cash).toBe(500);            // the unitemised money is cash, which is what it actually is
  expect(Object.values(b).reduce((t: number, v: any) => t + v, 0)).toBe(224690);   // still exact
});

test('a NEGATIVE leftover is a pricing artifact — it never becomes negative cash', () => {
  const { accountClassBreakdown } = require('../domain/assets');
  // priced holdings ($100,500) exceed the broker's stated total ($100,000) — stale prices, not money
  const b = accountClassBreakdown({
    asset_id: 'st-neg', source: 'connected', balance: 100000,
    positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 100.5, lots: [{ shares: 1000, cost_per_share: 90 }] }],
  } as any)!;
  expect(b.cash).toBe(0);              // never a negative cash balance
  expect(b.stocks_etf).toBe(100000);   // the artifact is absorbed where it came from
  expect(Object.values(b).reduce((t: number, v: any) => t + v, 0)).toBe(100000);
});

// ── A DEPOSIT LANDS AS CASH, AND SAYS SO ───────────────────────────────────────────────────────
test('a deposit into a holdings account becomes CASH in that account — not an unexplained total', () => {
  const { applyTransaction } = require('../domain/transactions');
  // exactly the founder's account: itemised holdings, the broker never sent a cash figure
  const before = [{
    asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage',
    tax_bucket: 'TAXABLE', balance: 224190, target_return: 0.05, source: 'connected',
    positions: [{ position_id: 'p1', ticker: 'CD1', name: 'ALLY CD', asset_class: 'bond', last_price: 1, lots: [{ shares: 224190, cost_per_share: 1 }] }],
  }] as any;
  const after = applyTransaction(before, { id: 't', account_id: 'van', type: 'DEPOSIT', amount: 500, date: '2026-08-11' } as any);
  const a = after[0];
  expect(a.cash_balance).toBe(500);        // the money has a NAME now — it is cash
  expect(a.balance).toBe(224690);          // and the account is worth $500 more, as it must be
  // and the classification explains the whole total, with nothing left to infer
  const { accountClassBreakdown } = require('../domain/assets');
  const b = accountClassBreakdown(a)!;
  expect(b.cash).toBe(500);
  expect(b.bonds).toBe(224190);            // the CDs did NOT grow — this was the founder's question
  expect(Object.values(b).reduce((t: number, v: any) => t + v, 0)).toBe(224690);
});

test('a plain account with no holdings still just grows by the deposit', () => {
  const { applyTransaction } = require('../domain/transactions');
  const before = [{ asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1000, target_return: 0 }] as any;
  const after = applyTransaction(before, { id: 't', account_id: 'sav', type: 'DEPOSIT', amount: 500, date: '2026-08-11' } as any);
  expect(after[0].balance).toBe(1500);
  expect(after[0].cash_balance).toBeUndefined();   // no sleeve invented where there is nothing to itemise
});

test('the deposit sheet says where the money lands, so nothing is decided silently', () => {
  useStore.setState({
    assetAccounts: [{
      asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
      balance: 224190, target_return: 0.05, source: 'connected', last_synced: new Date().toISOString(),
      positions: [{ position_id: 'p1', ticker: 'CD1', name: 'ALLY CD', asset_class: 'bond', last_price: 1, lots: [{ shares: 224190, cost_per_share: 1 }] }],
    }],
  } as any);
  mockParams = { id: 'van' };
  const AccountPortfolioScreen = require('../screens/AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  // mock v14: the deposit sheet opens through the contribution-or-withdrawal door
  fireEvent.press(screen.getByLabelText(/Add a contribution or withdrawal/));
  fireEvent.press(screen.getByLabelText(/Record a deposit/));
  expect(screen.getByText(/Lands as cash in this account/)).toBeOnTheScreen();
});

// ── THE THREE QUESTIONS: a line that names an answer lands ON that answer ───────────────────────
// FOUNDER RULE 2026-08-11 (refined): the screen shows what we ALREADY have and lets it be changed —
// it never hides an answered question. Missing ones come first; ?focus= puts one at the very top.
test('the three questions screen shows ALL three, missing first, prefilled with what we know', () => {
  const yr = new Date().getFullYear();
  // age ✔ and savings ✔ — only spending is missing
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 55), targetRetirementAge: '67' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000, target_return: 0.07 }],
  } as any);
  mockParams = {};
  // 2026-08-12: folded into the Plan tab — ONE component for the complete and the missing states
  const PlanHubScreen = require('../screens/PlanHubScreen').default;
  render(<PlanHubScreen />);
  expect(screen.getByText(/can't be calculated yet\. Add what you spend/)).toBeOnTheScreen();
  // the answered ones are STILL shown, prefilled, so they can be changed in place
  expect(screen.getByLabelText('Your age in years').props.value).toBe('55');
  expect(screen.getByText('Monthly expenses in retirement  MISSING')).toBeOnTheScreen();
  expect(screen.getByText('WHAT COUNTS TOWARD RETIREMENT')).toBeOnTheScreen();
  expect(screen.getByLabelText(/IRA.*Counts toward retirement\. Tap to change\./)).toBeOnTheScreen();
  // the payoff sits on the SAME screen — the sample until it becomes theirs
  expect(screen.getByText(/Sample: 84%/)).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText('Monthly expenses in retirement'), '4500');
  expect((useStore.getState() as any).retirementAssumptions.spendMonthly).toBe(4500);
});

test('answering the age question stores a believable birth year, and only a believable one', () => {
  useStore.setState({ onboardingProfile: { status: 'employed', incomeSources: ['employment'] } } as any);
  mockParams = {};
  const PlanHubScreen = require('../screens/PlanHubScreen').default;
  render(<PlanHubScreen />);
  const field = screen.getByLabelText('Your age in years');
  fireEvent.changeText(field, '5');                                     // half-typed
  expect((useStore.getState() as any).onboardingProfile.birthYear).toBeUndefined();
  fireEvent.changeText(field, '58');
  expect((useStore.getState() as any).onboardingProfile.birthYear).toBe(String(new Date().getFullYear() - 58));
});

test('the Net worth line lands on the question it names — not on a hub', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 55), targetRetirementAge: '67' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 400000, target_return: 0.07 }],
    liabilities: [],
  } as any);
  mockParams = {};
  const NetWorthScreen = require('../screens/NetWorthScreen').default;
  render(<NetWorthScreen />);
  // the accessible name says what it opens, and it is the QUESTION, not the Plan tab
  expect(screen.getByLabelText(/add what you spend and it becomes yours\. Opens that question\./)).toBeOnTheScreen();
});

test('the questions live on a TAB now, so no route guard can bounce them Home (the T22 class)', () => {
  const { MODAL_SEGMENTS } = require('../navigation/routeGuard');
  expect(MODAL_SEGMENTS).not.toContain('plan-answers');   // the route is gone, not orphaned
  const fs = require('fs');
  expect(fs.existsSync(require('path').join(__dirname, '..', 'screens/PlanAnswersScreen.tsx'))).toBe(false);
});

test('the three ways in are ONE list — Sharpen and the questions screen cannot word them differently', () => {
  const fs = require('fs'); const path = require('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  expect(read('screens/SharpenPlanScreen.tsx')).toMatch(/from '\.\.\/constants\/doors'/);
  expect(read('components/PlanInputs.tsx')).toMatch(/from '\.\.\/constants\/doors'/);
  expect(read('screens/SharpenPlanScreen.tsx')).not.toMatch(/Read-only: we can look, never touch your money/);
});

// ── ONE SCREEN, WHEREVER YOU TAP IT (founder rule 2026-08-11) ──────────────────────────────────
test('Home and Net worth open the SAME place the questions live — the Plan tab itself', () => {
  const fs = require('fs'); const path = require('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  // one destination now, deep-linked to the missing answer — no second screen to drift from
  for (const f of ['screens/HomeScreen.tsx', 'screens/NetWorthScreen.tsx']) {
    expect(read(f)).toMatch(/\/\(tabs\)\/plan/);
    expect(read(f)).not.toMatch(/plan-answers/);
  }
  expect(read('screens/NetWorthScreen.tsx')).toMatch(/focus=/);
  expect(read('screens/PlanHubScreen.tsx')).toMatch(/focusParam/);
});

// ── WHAT COUNTS TOWARD RETIREMENT (founder rule 2026-08-11) ────────────────────────────────────
test('all assets count except the primary home and the primary car', () => {
  const { earmarkDefault, primaryCarIdOf, retirementEarmarkedValue } = require('../domain/assets');
  const a = (over: any) => ({ asset_id: over.kind, label: over.kind, tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...over });
  const home = a({ kind: 'home', tax_bucket: 'PROPERTY', balance: 500000 });
  const rental = a({ kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, re_use: 'rental', asset_id: 'rental' });
  const car = a({ kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 30000, asset_id: 'car1' });
  const car2 = a({ kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 8000, asset_id: 'car2' });
  const cash = a({ kind: 'savings', tax_bucket: 'CASH', balance: 20000, asset_id: 'cash' });
  const all = [home, rental, car, car2, cash];
  expect(primaryCarIdOf(all)).toBe('car1');                    // the car you drive = the valuable one
  expect(earmarkDefault(home)).toBe(0);                        // the roof over your head
  expect(earmarkDefault(car, 'car1')).toBe(0);                 // the car you drive
  expect(earmarkDefault(car2, 'car1')).toBe(100);              // a SECOND car is a real asset
  expect(earmarkDefault(rental)).toBe(100);                    // a rental can be sold
  expect(earmarkDefault(cash)).toBe(100);                      // cash is money you can spend
  // 300,000 rental + 8,000 second car + 20,000 cash = 328,000; home and primary car excluded
  expect(retirementEarmarkedValue(all)).toBe(328000);
});

test('a person can change what counts, and their choice always beats the default', () => {
  const { earmarkedAmount, retirementEarmarkedValue } = require('../domain/assets');
  const home = { asset_id: 'h', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000, target_return: 0 } as any;
  // "I do plan to sell the house" — the override wins over the default exclusion
  expect(earmarkedAmount({ ...home, retirement_pct: 100 })).toBe(500000);
  // "keep my savings out of it" — and the other way round
  const cash = { asset_id: 'c', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0 } as any;
  expect(earmarkedAmount({ ...cash, retirement_pct: 0 })).toBe(0);
  expect(retirementEarmarkedValue([{ ...home, retirement_pct: 100 }, { ...cash, retirement_pct: 0 }])).toBe(500000);
});

test('tapping a row on the answers screen flips whether it counts', () => {
  useStore.setState({
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(new Date().getFullYear() - 55), monthlySpending: '4000' },
    assetAccounts: [{ asset_id: 'sav', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0 }],
  } as any);
  mockParams = {};
  const PlanHubScreen = require('../screens/PlanHubScreen').default;
  render(<PlanHubScreen />);
  expect(screen.getByText('WHAT COUNTS TOWARD RETIREMENT')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/Ally Savings.*Counts toward retirement\. Tap to change\./));
  expect((useStore.getState() as any).assetAccounts[0].retirement_pct).toBe(0);
});

// ── WHEN EVERYTHING IS ANSWERED (founder question 2026-08-11) ──────────────────────────────────
test('all three answered: both screens show the REAL verdict, no sample and no "See your plan"', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'self', onboardingComplete: true,
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryMode: 'gross',
      salaryFreq: 'monthly', birthYear: String(yr - 55), targetRetirementAge: '65', monthlySpending: '4500' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', institution: 'Vanguard', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 800000, target_return: 0.07 }],
    liabilities: [],
  } as any);
  mockParams = {};
  const NW = require('../screens/NetWorthScreen').default;
  render(<NW />);
  expect(screen.getByText(/retire at 65 with ~\$/)).toBeOnTheScreen();   // the real sentence
  expect(screen.queryByText(/Sample: 84%/)).toBeNull();                  // no sample beside a real verdict
  expect(screen.queryByText('See your plan ›')).toBeNull();              // and never the bare fallback
  screen.unmount();
  const Home = require('../screens/HomeScreen').default;
  render(<Home />);
  expect(screen.getByText(/odds of lasting to age/)).toBeOnTheScreen();
  expect(screen.getByText('See the full picture ›')).toBeOnTheScreen();  // Home leads to the whole plan
  expect(screen.queryByText(/Sample: 84%/)).toBeNull();
});

// the hole this question exposed: the door counted ANY account, the odds count what is EARMARKED
test('owning ONLY the home you live in is not "everything answered" — it says which part is missing', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: String(yr - 55), monthlySpending: '4500' },
    assetAccounts: [{ asset_id: 'h', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000, target_return: 0 }],
    liabilities: [],
  } as any);
  mockParams = {};
  const NW = require('../screens/NetWorthScreen').default;
  render(<NW />);
  // it used to look complete to the door and compute nothing → a bare "See your plan ›"
  expect(screen.queryByText('See your plan ›')).toBeNull();
  expect(screen.getByText(/Sample: 84%/)).toBeOnTheScreen();
  expect(screen.getByText(/choose what counts toward retirement and it becomes yours/)).toBeOnTheScreen();
});

test('the door credits what actually COUNTS, not every balance on file', () => {
  const { planDoor } = require('../domain/planning/hub');
  const accounts = [
    { asset_id: 'h', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000, target_return: 0 },
    { asset_id: 's', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 20000, target_return: 0 },
  ] as any;
  const d = planDoor({ birthYear: '1970', monthlySpending: '4000' }, accounts);
  expect(d.count).toBe(0);                       // the savings make it computable
  expect(d.credit.total).toBe(20000);            // …and only the savings are credited, not the home
});

// ── THE VERDICT WORD CARRIES ITS NUMBER (founder question 2026-08-11: "what does uncertain mean?") ─
// FOUNDER RULE 2026-08-11: one wording on all three screens —
// "<word> — xx% odds of lasting to age abc"
test('the Net worth verdict shows the odds in the ONE app-wide wording — no verdict word', () => {
  const yr = new Date().getFullYear();
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'self', onboardingComplete: true,
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '9000', salaryMode: 'gross',
      salaryFreq: 'monthly', birthYear: String(yr - 55), targetRetirementAge: '65', monthlySpending: '4500' },
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', institution: 'Vanguard', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 800000, target_return: 0.07 }],
    liabilities: [],
  } as any);
  mockParams = {};
  const NW = require('../screens/NetWorthScreen').default;
  render(<NW />);
  expect(screen.getByText(/\d+% odds of lasting to age \d+/)).toBeOnTheScreen();
  expect(screen.queryByText(/Likely|Uncertain|Unlikely|Holding|Watch closely|Running short/)).toBeNull();
});

test('the number is explained where the question gets asked, including the apparent contradiction', () => {
  const { GLOSSARY } = require('../domain/glossary');
  const body = GLOSSARY.nestEggMath.body;
  // 2026-08-12: there is no verdict word left to define — the explainer defines the NUMBER, and
  // says plainly why no word sits beside it
  expect(body).toMatch(/WHAT THE NUMBER MEANS/);
  expect(body).toMatch(/600 of them and ran out in the rest/);
  expect(body).not.toMatch(/Likely|Uncertain|Unlikely|Holding|Watch closely|Running short/);
  // and WHY a plan with money to spare can still show low odds — two true facts, not a mistake
  expect(body).toMatch(/WHY A LOW NUMBER CAN SIT NEXT TO MONEY TO SPARE/);
  expect(body).toMatch(/MIDDLE future/);
  expect(body).toMatch(/22 runs out of 100 the money still ran out/);
});

// ── ONE WORDING FOR THE ODDS, EVERYWHERE (founder rule 2026-08-11) ─────────────────────────────
test('Home, Net worth and Plan say the odds in the SAME words, from one helper', () => {
  const { oddsLine, sampleOddsLine } = require('../domain/planning/hub');
  // FOUNDER RULING 2026-08-12: the verdict word is gone — "uncertain and giving it 60%
  // probability does not make sense; it should be either or". The number carries the uncertainty.
  expect(oddsLine('preretired', 78, 90)).toBe('78% odds of lasting to age 90');
  expect(oddsLine('preretired', 84, 92)).toBe('84% odds of lasting to age 92');
  expect(oddsLine('retired', 45, 95)).toBe('45% odds of lasting to age 95');
  // the lens no longer changes the verdict — one sentence for everyone
  expect(oddsLine('retired', 78, 90)).toBe(oddsLine('preretired', 78, 90));
  expect(sampleOddsLine()).toBe('Sample: 84% odds of lasting to age 90');
  expect(sampleOddsLine(92)).toBe('Sample: 84% odds of lasting to age 92');
  // and no screen builds the sentence by hand any more — the old phrasings are gone for good
  const fs = require('fs'); const path = require('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  for (const f of ['screens/HomeScreen.tsx', 'screens/NetWorthScreen.tsx', 'screens/PlanHubScreen.tsx']) {
    expect(read(f)).toMatch(/oddsLine\(|sampleOddsLine\(/);
    expect(read(f)).not.toMatch(/in 100 paths/);
    expect(read(f)).not.toMatch(/% odds of lasting to age \{/);   // no hand-built copy of the sentence
  }
});

// ── A LONG DEFINITION MUST BE READABLE (founder finding 2026-08-11) ────────────────────────────
test('the info dot scrolls — a definition longer than the card is no longer unreachable', () => {
  const { InfoDot } = require('../components/UI');
  const { GLOSSARY } = require('../domain/glossary');
  const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
  render(<InfoDot term="nestEggMath" />);
  fireEvent.press(screen.getByLabelText('What is How we calculate your odds?'));
  // the body sits in a scroller that is capped, so the Got-it button can never be pushed off-screen
  const scrollers = screen.UNSAFE_getAllByType(require('react-native').ScrollView);
  expect(scrollers.length).toBeGreaterThan(0);
  expect(flat(scrollers[0]).maxHeight).toBe('70%');
  expect(screen.getByText('Got it')).toBeOnTheScreen();
  // and the definition really is longer than a phone card — this is why it needed to scroll
  expect(GLOSSARY.nestEggMath.body.length).toBeGreaterThan(2000);
});

// ── PERFORMANCE HANDOFF (2026-08-11): the parts must sum to the whole ──────────────────────────
test('every account with value gets its own walk, so the per-account walks sum to the all-accounts walk', () => {
  const today = isoLocalDate(new Date());
  useStore.setState({
    onboardingComplete: true, nwSeeded: true,
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], monthlySpending: '4500' },
    assetAccounts: [
      // one account WITH itemised holdings…
      { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
        balance: 300000, target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`,
        positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 100, price: 100, shares: 3000,
          lots: [{ lot_id: 'l1', shares: 3000, cost_per_share: 90, purchase_date: '2024-01-02' }] }] },
      // …and one WITHOUT: a CD account with a balance and nothing itemised. It used to vanish from
      // the per-account walks entirely, so the parts stopped adding up to the whole.
      { asset_id: 'etr', label: 'E*TRADE Treasuries & CDs', institution: 'E*TRADE', kind: 'fixed_income',
        asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 52704, target_return: 0.042,
        source: 'connected', last_synced: `${today}T09:00:00Z` },
    ],
    liabilities: [],
  } as any);
  mockParams = {};
  const Perf = require('../screens/PerformanceScreen').default;
  render(<Perf />);
  // the all-accounts walk says what it is, because per-account walks sit directly beneath it. With
  // no daily record yet this is DAY ONE (Performance v17, phone 4): the walk stands at today's value
  // and every account's walk is open beneath it.
  expect(screen.getByText("HOW TODAY'S VALUE STANDS · ALL ACCOUNTS")).toBeOnTheScreen();
  // and BOTH accounts have a walk of their own — the CD account included
  expect(screen.getByLabelText(/^Vanguard Brokerage, \$300,000/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/^E\*TRADE.*, \$52,704/)).toBeOnTheScreen();
  expect(screen.getAllByText('Beginning market value (today)')).toHaveLength(3);   // the whole, and its two parts
  // THE PARTS SUM TO THE WHOLE: 300,000 + 52,704 = 352,704, each an account's own balance
  expect(screen.getAllByText('$352,704').length).toBeGreaterThan(0);
});

// ── WHOSE FACT IS THIS ROW? (handoff 2026-08-11) ───────────────────────────────────────────────
test('a row you entered is marked yours and editable; a broker row says where it came from and is not', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage',
      tax_bucket: 'TAXABLE', balance: 10000, target_return: 0, source: 'connected', last_synced: new Date().toISOString() }],
    transactions: [
      { id: 'broker', account_id: 'van', type: 'DIVIDEND', amount: 120, date: '2026-08-01', source: 'connected' },
      { id: 'mine', account_id: 'van', type: 'DEPOSIT', amount: 500, date: '2026-07-22' },
    ],
  } as any);
  mockParams = { id: 'van' };
  const AccountPortfolioScreen = require('../screens/AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('you entered this')).toBeOnTheScreen();
  expect(screen.getByText('from Vanguard')).toBeOnTheScreen();
  // only YOUR row offers the pencil — a broker row would be overwritten by the next sync
  const edits = screen.queryAllByLabelText(/Edit or delete your/);
  expect(edits).toHaveLength(1);
  expect(edits[0].props.accessibilityLabel).toMatch(/deposit of \$500/);
});

test('correcting your record reverses the old amount and records the new one — the balance stays right', () => {
  useStore.getState().resetAll();
  useStore.setState({
    assetAccounts: [{ asset_id: 'sav', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 1000, target_return: 0 }],
  } as any);
  // a deposit typed as $5,000 when it should have been $500
  (useStore.getState() as any).recordTransaction({ account_id: 'sav', type: 'DEPOSIT', amount: 5000, date: '2026-08-01' });
  expect((useStore.getState() as any).assetAccounts[0].balance).toBe(6000);
  mockParams = { id: 'sav' };
  const AccountPortfolioScreen = require('../screens/AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  fireEvent.press(screen.getByLabelText(/Edit or delete your deposit/));
  fireEvent.changeText(screen.getByLabelText('Amount'), '500');
  fireEvent.press(screen.getByLabelText('Save this correction'));
  // the wrong amount is reversed and the right one recorded — not patched behind the ledger's back
  expect((useStore.getState() as any).assetAccounts[0].balance).toBe(1500);
  const rows = (useStore.getState() as any).transactions.filter((t: any) => t.account_id === 'sav');
  expect(rows).toHaveLength(1);
  expect(rows[0].amount).toBe(500);
});

test('the activity door names the DATE the list stops at, not just how many rows are hidden', () => {
  const many = Array.from({ length: 14 }, (_, i) => ({
    id: `t${i}`, account_id: 'van', type: 'DEPOSIT', amount: 100,
    date: `2026-0${(i % 8) + 1}-0${(i % 9) + 1}`,
  }));
  useStore.setState({
    assetAccounts: [{ asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0 }],
    transactions: many,
  } as any);
  mockParams = { id: 'van' };
  const AccountPortfolioScreen = require('../screens/AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('14 records')).toBeOnTheScreen();          // the header carries the count
  expect(screen.getByText(/See all activity \(older than \w{3} \d+, \d{4}\)/)).toBeOnTheScreen();
  expect(screen.getByText(/6 more records below this date/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/See all activity — 6 more records, older than/));
  expect(screen.queryByText(/See all activity/)).toBeNull();         // expanded → the door is spent
});
