/** NET WORTH v08 — the approved mock, built (founder, 2026-09-14: "approved").
 *  MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html
 *  Pins the marks that are new in code: the three ways to add an account once on the first day (1, 14),
 *  the add sheet's title (2), "＋ Add an account" (3), the hero's line opening the sheet (4), the return
 *  to two decimals (11), and Linked with a date only when stale (12). The fix sheet's Link again (13)
 *  and the exact odds (10) are pinned beside their functions. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { recordedDay } from '../../testing/recordedDay';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { ADD_ACCOUNT_DOORS, ADD_ACCOUNT_QUESTION } from '../../constants/doors';
import { isoLocalDate } from '../../domain/_shared/dates';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: mockPush },
}));
const router = { push: mockPush };
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const visible = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; } (Array.isArray(n) ? n : n.children ?? []).forEach(walk); };
  walk(screen.toJSON()); return out;
};
// today in the person's own calendar (the app's one date writer), and a sync an hour ago — a fixed 09:00 UTC
// sync was in the future between 00:00 and 09:00 UTC, so the chip did not read Linked at those hours
const today = isoLocalDate(new Date());
const syncedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe('first day (state C)', () => {
  beforeEach(() => { useStore.getState().resetAll(); useStore.getState().setOnboardingProfile(employedPartner as any); (router.push as jest.Mock).mockClear(); });

  test('one line and the three doors once — no "Add your accounts ›" under each group, no separate heading', () => {
    render(<NetWorth />);
    const v = visible();
    expect(v.filter((s) => s === 'Add your accounts ›')).toHaveLength(1);            // the hero's, only
    expect(v.filter((s) => s === ADD_ACCOUNT_QUESTION)).toHaveLength(1);
    expect(v.filter((s) => s === 'Nothing entered yet.')).toHaveLength(3);           // hero · what you own · debts
    const at = (s: string) => v.indexOf(s);
    expect(at('💵 CASH')).toBeLessThan(at(ADD_ACCOUNT_QUESTION));
    expect(at(ADD_ACCOUNT_QUESTION)).toBeLessThan(at('Link it (read-only)'));
    expect(at('Link it (read-only)')).toBeLessThan(at('Add by hand'));
    expect(at('Add by hand')).toBeLessThan(at('Import from a file'));
    expect(at('Import from a file')).toBeLessThan(at('or walk through it step by step'));
    for (const old of ['Connect a brokerage', 'Add a file from your bank', 'Type it yourself', 'Add a mortgage, card, or loan']) expect(v).not.toContain(old);
    // MOVED 2026-10-11 by DEC-4528: the debts door read "Add a mortgage, card, or loan"; it now reads "Add your debts" + its ›
    expect(v).toContain('Add your debts');
  });

  test('each door opens its own place in one tap', () => {
    render(<NetWorth />);
    fireEvent.press(screen.getByText('Add by hand'));
    expect(router.push).toHaveBeenCalledWith('/add-account');
  });

  test('the hero line opens the add sheet, titled with the one question', () => {
    render(<NetWorth />);
    fireEvent.press(screen.getByText('Add your accounts ›'));
    expect(screen.getAllByText(ADD_ACCOUNT_QUESTION)).toHaveLength(2);                // the line + the sheet's title
    for (const d of ADD_ACCOUNT_DOORS) expect(screen.getByLabelText(`${d.title}. ${d.sub}`)).toBeOnTheScreen();
  });
});

describe('with accounts', () => {
  beforeEach(() => {
    useStore.getState().resetAll();
    useStore.setState({
      onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
      onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
      assetAccounts: [
        { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0, source: 'connected', last_synced: syncedAt },
        { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 355152, target_return: 0.07, source: 'connected', last_synced: syncedAt,
          // a linked account's value is its holdings: the daily record reads them, so the return has something to measure
          positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 355152, lots: [{ lot_id: 'l1', shares: 1, cost_per_share: 300000, purchase_date: '2024-01-02' }] }] },
      ],
      liabilities: [],
      nwDaily: { '2026-08-03': 361242, [today]: 363152 },
      // the day the return is measured from: $8,000 checking + $353,242 brokerage = $361,242
      snapshotDays: [recordedDay('2026-08-03', [['chk', 8000, 'cash'], ['van', 353242]])],
    } as any);
  });

  test('"＋ Add an account" opens the sheet with its title and the three doors', () => {
    render(<NetWorth />);
    expect(screen.queryByText('＋ Add or connect an account')).toBeNull();
    fireEvent.press(screen.getByLabelText('Add an account'));
    expect(screen.getByText(ADD_ACCOUNT_QUESTION)).toBeOnTheScreen();
    expect(screen.getByText('🔗  Link it (read-only)')).toBeOnTheScreen();
  });

  test('the return on cash + investments shows two decimals', () => {
    render(<NetWorth />);
    // (363,152 − 361,242) ÷ 361,242 = 0.5287…% → +0.53%
    expect(screen.getByText(/Return on cash \+ investments \+0\.53%/)).toBeOnTheScreen();
  });

  test('a fresh linked account says Linked, with no date', () => {
    render(<NetWorth />);
    expect(screen.getAllByText('🔗 Linked').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Connected ·/)).toBeNull();
  });
});

test('a stale linked account carries its age; a fresh one does not', () => {
  const { SourceChip } = require('../../components/SourceChip');
  const old = new Date(Date.now() - 10 * 86400000).toISOString();
  const r = render(<SourceChip account={{ asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1, source: 'connected', last_synced: old } as any} />);
  expect(r.getByText('🔗 Linked · 10 days old')).toBeTruthy();
});
