// FOUNDER FINDINGS + RULES, 2026-08-11 (device review of build 51 + the naming decision).
// One test per thing asked for, each named so a failure says which promise broke.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import { accountDisplayName, accountDisplayNames, accountLastFour } from '../domain/assets';
import { dataGaps } from '../domain/gaps';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));

beforeEach(() => useStore.getState().resetAll());

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
  expect(titles[1]).toMatch(/Vanguard -1129 last updated Aug 3/);
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

test('an account the sync could NOT reach says so, and offers the re-login instead of another sync', () => {
  const NOW = Date.parse('2026-08-11T12:00:00Z');
  const accounts = [
    { asset_id: 'v1', label: 'Brokerage', institution: 'Vanguard', mask: '••5738', source: 'connected', last_synced: '2026-08-03T09:00:00Z', tax_bucket: 'TAXABLE', balance: 1, target_return: 0 },
  ] as any;
  const failures = [{ accountId: 'v1', at: '2026-08-11T11:00:00Z', reason: 'connection expired' }];
  const gaps = dataGaps(accounts, null, NOW, [], failures);
  const g = gaps.find((x) => x.kind === 'unreachable-account')!;
  expect(g.title).toBe("We couldn't reach Vanguard -5738");
  expect(g.fixLabel).toBe('Reconnect');
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
  const sync = jest.fn().mockResolvedValue(1);
  jest.doMock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: sync }));
  const { DataGapsBanner } = require('../components/DataGapsBanner');
  render(<DataGapsBanner gaps={[{
    kind: 'stale-account', accountId: 'v1', title: 'Vanguard -5738 last updated Aug 3',
    meanwhile: 'Balances may have moved.', fixLabel: 'Sync now', route: '/account-detail?id=v1', action: 'sync',
  }]} />);
  fireEvent.press(screen.getByText(/1 number needs more information/));
  await fireEvent.press(screen.getByLabelText(/Sync now\. Updates this account now\./));
  expect(sync).toHaveBeenCalledWith({ force: true });
  expect(await screen.findByText(/Updated\. Anything still listed here needs a re-login\./)).toBeOnTheScreen();
});
