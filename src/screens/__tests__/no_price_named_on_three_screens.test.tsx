/** A HOLDING ADDED BY HAND THAT HAS NO PRICE TODAY IS NAMED IN THE AMBER BOX ON ALL THREE SCREENS THAT CARRY ONE, IN THE
 *  SAME WORDS — AND A PRICED HOLDING ON NONE (2026-10-21).
 *
 *  The amber box of missing information (MK-XS-F-002 dataGaps) sits on Net worth, Performance and the account page. A
 *  holding added by hand is priced from the price history the app holds; when that history holds no price for it, the
 *  box names it, the way Net worth v08 draws it in its amber box and its fix sheet (state F). Performance and the account
 *  page handed the box a price lookup; Net worth handed none, so its box said nothing about LCTX while the other two
 *  named it. All three now hand it the ONE lookup, latestCloseLookup (src/domain/performance) — Net worth through the
 *  family's inputs (MK-NW-F-145 netWorthInputs, DEC-0345), so the screen itself looks nothing up.
 *
 *  The household is written by the same store actions the add-a-holding sheet calls (addAsset, then addPosition), so
 *  the account has the shape the app stores, not a shape typed here: one brokerage added by hand, holding 965 shares of
 *  LCTX (no price history held) and 10 shares of VTI (a close of $250 held). A day recorded a month ago puts the
 *  account page past its first day, where its amber box shows.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { latestCloseLookup } from '../../domain/performance';
import { netWorthInputs } from '../../hooks/useNetWorthInputs';
import { isoLocalDate } from '../../domain/_shared/dates';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const day = (back: number) => isoLocalDate(new Date(Date.now() - back * 864e5));
const typedDay = (id: string, date: string, value: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, typedValue: value, currency: 'USD' }],
});
const close = (ticker: string, price: number) => ({ ticker, points: [{ date: day(1), close: price }] });

let accountId = '';
function seed(cache: Record<string, any>) {
  useStore.getState().resetAll();
  // prices fetched a moment ago, so no screen starts a price fetch of its own while it is read
  useStore.setState({ nwSeeded: true, hideBalances: false, pricesFetchedAt: new Date().toISOString(), priceCache: cache } as any);
  const st = useStore.getState() as any;
  st.addAsset({ label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.08, positions: [], derive_balance: true });
  accountId = (useStore.getState() as any).assetAccounts[0].asset_id;
  st.addPosition(accountId, { ticker: 'LCTX', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 965, cost_per_share: 1.2, purchase_date: day(200) }] });
  st.addPosition(accountId, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l2', shares: 10, cost_per_share: 200, purchase_date: day(200) }] });
  useStore.setState({ snapshotDays: [typedDay(accountId, day(30), 3658)] } as any);
}

/** What a line of the amber box says, read off the rendered tree: its words, without the bullet. */
const textOf = (n: any): string => (typeof n === 'string' ? n : (n?.children ?? []).map(textOf).join(''));
const boxLines = () => screen.queryAllByTestId('gap-line').map((v) => textOf(v).replace(/^·/, '').trim());
/** The sentence that names a holding — the account page goes on to say what the app does meanwhile; the name is its
 *  first sentence, as Net worth and Performance print it on its own. */
const naming = (lines: string[], ticker: string) => lines.filter((l) => l.includes(ticker)).map((l) => l.split('. ')[0]);

const SCREENS: { name: string; open: () => void }[] = [
  { name: 'Net worth', open: () => { const C = require('../NetWorthScreen').default; render(<C />); } },
  { name: 'Performance', open: () => { const C = require('../PerformanceScreen').default; render(<C />); } },
  { name: 'Account page', open: () => {
    jest.spyOn(require('expo-router'), 'useLocalSearchParams').mockReturnValue({ id: accountId });
    const C = require('../AccountPortfolioScreen').default; render(<C />);
  } },
];
afterEach(() => jest.restoreAllMocks());

test('the one lookup: Net worth\'s inputs carry the same price lookup Performance and the account page are handed', () => {
  seed({ VTI: close('VTI', 250) });
  const cache = (useStore.getState() as any).priceCache;
  const nwIn = netWorthInputs(useStore.getState());
  for (const lookup of [latestCloseLookup(cache), nwIn.latestCloseOf]) {
    expect(lookup('LCTX')).toBeNull();      // no price history held
    expect(lookup(' vti ')).toBe(250);      // read as the ticker is stored: trimmed, upper case
  }
  // the account the screens read has the stored shape: the shares on the purchases, no price written on the holding
  const acct = nwIn.accounts.find((a) => a.asset_id === accountId)!;
  expect((acct.positions ?? []).map((p: any) => [p.ticker, p.lots.reduce((t: number, l: any) => t + l.shares, 0), p.last_price ?? null]))
    .toEqual([['LCTX', 965, null], ['VTI', 10, null]]);
});

test('LCTX, with no price today, is named in the amber box on Net worth, Performance and the account page — in the same words; VTI, priced, on none', () => {
  const seen: Record<string, string[]> = {};
  for (const s of SCREENS) {
    seed({ VTI: close('VTI', 250) });
    s.open();
    // the screen drew the account (a screen that drew nothing would show no box at all)
    expect([s.name, screen.queryAllByText(/Schwab|Brokerage/).length > 0]).toEqual([s.name, true]);
    seen[s.name] = boxLines();
    screen.unmount();
    jest.restoreAllMocks();
  }
  // the test looked: every screen drew its amber box, and each box has exactly one line
  expect(Object.keys(seen)).toEqual(['Net worth', 'Performance', 'Account page']);
  for (const name of Object.keys(seen)) expect([name, seen[name].length]).toEqual([name, 1]);
  // the same words on all three
  for (const name of Object.keys(seen)) expect([name, naming(seen[name], 'LCTX')]).toEqual([name, ['LCTX has no price today']]);
  // the priced holding is named on none
  for (const name of Object.keys(seen)) expect([name, naming(seen[name], 'VTI')]).toEqual([name, []]);
});

test('once the price history holds a close for LCTX, no screen draws the amber box', () => {
  for (const s of SCREENS) {
    seed({ VTI: close('VTI', 250), LCTX: close('LCTX', 1.31) });
    s.open();
    expect([s.name, screen.queryAllByText(/Schwab|Brokerage/).length > 0]).toEqual([s.name, true]);
    expect([s.name, boxLines()]).toEqual([s.name, []]);
    expect([s.name, screen.queryByText(/needs? more information/)]).toEqual([s.name, null]);
    screen.unmount();
    jest.restoreAllMocks();
  }
});
