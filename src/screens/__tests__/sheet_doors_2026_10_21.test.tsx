/** EVERY SHEET HAS A DOOR, AND EVERY DOOR OPENS ITS SHEET (2026-10-21, gaps 7 and 8 of the Performance launch audit).
 *
 *  Gap 7 — the account page's "Add a buy or sale ›" (account-page drawing v01, ACTIVITY's third door) sent a stock or
 *  mixed account to the Performance tab, which cannot record a trade. It now opens the ONE trade sheet (TransactionSheet,
 *  the sheet the Holding page opens) with this account chosen. Walked here end to end: tap the door → the sheet opens with
 *  the account chosen → a buy is saved → the account page lists it under ACTIVITY.
 *
 *  Gap 8 — the Performance tab mounted six sheets nothing could open (Add / Edit holding, the trade sheet, History,
 *  the Bond editor, the Alternatives editor). v14 removed their buttons (2026-09-25) and v17 draws none. Each is opened
 *  where its door is drawn — the Holding page (✎ Edit, Record buy/sell, Activity), the account page (Add a buy or sale),
 *  Bonds (＋ Add a bond), Alternatives (＋ Add an investment) — so the tab's mounts are removed. The holding editor's
 *  "Add a holding" mode had no door anywhere, so it went with them; in Edit every Type chip now sets the type.
 */
import React from 'react';
import { Alert, Modal, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { accountDisplayNames } from '../../domain/assets';
import { isoLocalDate } from '../../domain/_shared/dates';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const flat = (n: any) => StyleSheet.flatten(n?.props?.style) ?? {};
const TODAY = isoLocalDate(new Date());
const back = (n: number) => isoLocalDate(new Date(Date.now() - n * 86_400_000));

/** A brokerage built by hand: Vanguard, named Brokerage, $50,000 typed on a day a month ago. */
const VANGUARD = { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000, source: 'manual', value_as_of: back(30) };
/** Another account, so the sheet has a choice to make and the test can see it chose this one. */
const SCHWAB = { asset_id: 'sch', label: 'IRA', institution: 'Schwab', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 20_000, source: 'manual', value_as_of: back(30) };
/** A linked account holding a stock and a bond fund: Mixed holdings. */
const FIDELITY = { asset_id: 'fid', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 15_000, source: 'connected', cash_balance: 0,
  positions: [{ position_id: 'q1', ticker: 'VTI', kind: 'stocks_etf', last_price: 100, lots: [{ lot_id: 'a', shares: 100, cost_per_share: 80 }] },
    { position_id: 'q2', ticker: 'BND', kind: 'fixed_income', asset_class: 'bond', last_price: 50, lots: [{ lot_id: 'b', shares: 100, cost_per_share: 50 }] }] };

function openAccount(account: any, others: any[] = []) {
  useStore.getState().resetAll();
  mockPushes.length = 0;
  mockParams = { id: account.asset_id };
  useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [account, ...others], transactions: [], snapshotDays: [], priceCache: {} } as any);
  const AccountPortfolioScreen = require('../AccountPortfolioScreen').default;
  render(<AccountPortfolioScreen />);
}
const nameOf = (id: string) => accountDisplayNames((useStore.getState() as any).assetAccounts).get(id)!;
const chosen = (label: string) => flat(screen.getByLabelText(`Account: ${label}`)).backgroundColor === Colors.primaryLight;

// ═══ GAP 7 ════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('gap 7 · "Add a buy or sale ›" on the account page opens the trade sheet, this account chosen', () => {
  test('the journey: tap the door → the sheet, Vanguard chosen → a buy of 10 VTI at $100.00 → ACTIVITY lists it', () => {
    openAccount(VANGUARD, [SCHWAB]);
    expect(screen.queryByText('Record activity')).toBeNull();                    // closed until the door is tapped
    fireEvent.press(screen.getByLabelText('Add a buy or sale for Brokerage'));
    expect(mockPushes).toEqual([]);                                                  // no trip to the Performance tab
    expect(screen.getByText('Record activity')).toBeOnTheScreen();
    expect(chosen(nameOf('van'))).toBe(true);                                        // this account, chosen
    expect(chosen(nameOf('sch'))).toBe(false);
    expect(flat(screen.getByLabelText('Transaction type: Buy')).backgroundColor).toBe(Colors.primaryLight);   // a buy, ready
    fireEvent.changeText(screen.getByPlaceholderText('e.g. AAPL'), 'VTI');
    const [shares, price] = screen.getAllByPlaceholderText('0');
    fireEvent.changeText(shares, '10');
    fireEvent.changeText(price, '100');
    fireEvent.press(screen.getByLabelText('Record buy'));
    expect(screen.queryByText('Record activity')).toBeNull();                    // the sheet closes on save
    const t = (useStore.getState() as any).transactions;
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ type: 'BUY', account_id: 'van', ticker: 'VTI', shares: 10, price: 100, date: TODAY });
    // the account page shows it, under ACTIVITY, as a record you entered
    expect(screen.getByText('Buy · VTI · 10 shares @ $100.00')).toBeOnTheScreen();
    expect(screen.getByText(/· you entered this$/)).toBeOnTheScreen();
    expect(screen.getByText('ACTIVITY · SINCE TODAY')).toBeOnTheScreen();
  });

  test('a linked account with several kinds of holding (Mixed holdings): the same sheet, that account chosen', () => {
    openAccount(FIDELITY, [VANGUARD]);
    expect(screen.getByText(/^Mixed holdings · /)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Add a buy or sale for Brokerage'));
    expect(screen.getByText('Record activity')).toBeOnTheScreen();
    expect(chosen(nameOf('fid'))).toBe(true);
    expect(chosen(nameOf('van'))).toBe(false);
    expect(mockPushes).toEqual([]);
  });

  test('the door\'s other ways stay as they were: a bond opens Bonds, an alternative opens Alternatives; cash and a 529 listing nothing have no third door; a 529 listing its funds has it (DEC-2484g)', () => {
    openAccount({ asset_id: 'muni', label: 'Muni 2029', kind: 'fixed_income', asset_class: 'bonds', balance: 10_000, face_value: 10_000, maturity_date: '2029-06-01', source: 'manual', value_as_of: back(30) });
    fireEvent.press(screen.getByLabelText('Add a buy or sale for Muni 2029'));
    expect(mockPushes).toEqual(['/bonds']);
    openAccount({ asset_id: 'gold', label: 'Gold coins', kind: 'commodities', tax_bucket: 'TAXABLE', balance: 8_000, source: 'manual', value_as_of: back(30) });
    fireEvent.press(screen.getByLabelText('Add a buy or sale for Gold coins'));
    expect(mockPushes).toEqual(['/other-investments']);
    openAccount({ asset_id: 'sav', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: back(30) });
    expect(screen.queryByText('Add a buy or sale ›')).toBeNull();
    // a 529 listing nothing cannot take a recorded buy or sale (accountAllowsTicker), so it has no door onto a sheet that would refuse it
    const C529 = { asset_id: 'c529', label: 'College fund', kind: 'college_529', tax_bucket: 'TAXABLE', balance: 9_000, source: 'manual', value_as_of: back(30) };
    openAccount(C529);
    expect(screen.getByText('Add a contribution or withdrawal ›')).toBeOnTheScreen();   // the page drew its doors
    expect(screen.queryByText('Add a buy or sale ›')).toBeNull();
    // DEC-2484g, his ruling: an account that already lists holdings can take a recorded buy or sale — a 529 listing its fund too
    openAccount({ ...C529, positions: [{ position_id: 'f', ticker: 'VTSAX', kind: 'stocks_etf', lots: [{ lot_id: 'a', shares: 50, cost_per_share: 100 }] }] });
    fireEvent.press(screen.getByLabelText('Add a buy or sale for College fund'));
    expect(screen.getByText('Record activity')).toBeOnTheScreen();
    expect(chosen(nameOf('c529'))).toBe(true);
    expect(mockPushes).toEqual([]);
  });
});

// ═══ GAP 8 ════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('gap 8 · the Performance tab mounts no sheet it cannot open, and each sheet opens from its drawn door', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'PerformanceScreen.tsx'), 'utf8');
  const tab = SRC.slice(SRC.indexOf('export default function PerformanceScreen'), SRC.indexOf('export function HoldingEditor'));

  test('the tab\'s own code mounts none of the six, and keeps no open flag for them (the guard read the whole tab)', () => {
    expect(tab.split('\n').length).toBeGreaterThan(400);                             // it looked at the whole component
    for (const gone of ['<HoldingEditor', '<TransactionSheet', '<HistorySheet', '<BondEditor', '<AltEditor',
      'setTxnOpen', 'setHistoryOpen', 'setAddOpen', 'setBondAddOpen', 'setAltAddKind', 'setEdit(']) expect(`${gone}: ${tab.includes(gone)}`).toBe(`${gone}: false`);
    expect(tab).toContain('<Modal visible={addChooser}');                             // the one sheet it opens: the ways to add an account
  });

  test('rendered with holdings, the tab carries exactly one sheet — the three ways to add an account', () => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [FIDELITY], transactions: [], snapshotDays: [], priceCache: {} } as any);
    const PerformanceScreen = require('../PerformanceScreen').default;
    render(<PerformanceScreen />);
    // every Modal on the tab, less the ones its info dots and its amber box carry (each opens its own explanation)
    const { InfoDot } = require('../../components/UI');
    const { DataGapsBanner } = require('../../components/DataGapsBanner');
    const modals = screen.UNSAFE_getAllByType(Modal).length;
    const dots = screen.UNSAFE_queryAllByType(InfoDot).length;
    const boxes = screen.UNSAFE_queryAllByType(DataGapsBanner).reduce((n: number, b: any) => n + b.findAllByType(Modal).length, 0);
    expect(dots).toBeGreaterThanOrEqual(2);                                          // it looked: the dots are there
    expect(screen.UNSAFE_queryAllByType(InfoDot).every((d: any) => d.findAllByType(Modal).length === 1)).toBe(true);
    expect(modals - dots - boxes).toBe(1);                                           // the three ways to add an account
  });

  describe('the Holding page opens three of them, from the doors holding detail v02 draws', () => {
    const AAPL = { position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }] };
    const show = (extra: any = {}) => {
      useStore.getState().resetAll();
      mockParams = { account: 'fid', position: 'p1' };
      useStore.setState({ onboardingComplete: true, hideBalances: false,
        assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions: [{ ...AAPL, ...extra }] }, VANGUARD],
        transactions: [{ id: 'd1', account_id: 'fid', type: 'DIVIDEND', ticker: 'AAPL', amount: 134.4, date: back(60), created_at: '' }],
        priceCache: { AAPL: { ticker: 'AAPL', points: [{ date: back(400), close: 175 }, { date: TODAY, close: 241.84 }] } } } as any);
      const HoldingDetailScreen = require('../HoldingDetailScreen').default;
      render(<HoldingDetailScreen />);
    };

    test('✎ Edit → Edit holding: no add mode, no "＋ New account", the account it is in, and every Type chip sets the type', () => {
      show();
      fireEvent.press(screen.getByLabelText('Edit this holding'));
      expect(screen.getByText('Edit holding')).toBeOnTheScreen();
      expect(screen.queryByText('Add a holding')).toBeNull();
      expect(screen.queryByText('＋ New account')).toBeNull();
      expect(screen.getByLabelText('Account: Fidelity')).toBeOnTheScreen();
      expect(screen.queryByLabelText('Account: Vanguard')).toBeNull();                 // choosing it saved nothing
      // DEC-2334: private equity and hedge funds are not offered in this phase
      expect(screen.queryByLabelText('Type: Private equity')).toBeNull();
      expect(screen.queryByLabelText('Type: Hedge funds')).toBeNull();
      // the five that did nothing when tapped now set the type: Options asks for contracts, Fixed income for a bond's facts
      fireEvent.press(screen.getByLabelText('Type: Options'));
      expect(screen.getByText('Contracts you hold')).toBeOnTheScreen();
      fireEvent.press(screen.getByLabelText('Type: Fixed income'));
      expect(screen.getByText('Face value (optional)')).toBeOnTheScreen();
      for (const k of ['Crypto', 'Gold / commodities', 'Annuities']) {
        fireEvent.press(screen.getByLabelText(`Type: ${k}`));
        expect(flat(screen.getByLabelText(`Type: ${k}`)).backgroundColor).toBe(Colors.primaryLight);
      }
    });

    test('a holding saved as private equity before this phase keeps its own chip (DEC-2334: a row saved earlier is kept)', () => {
      show({ kind: 'private_equity' });
      fireEvent.press(screen.getByLabelText('Edit this holding'));
      expect(flat(screen.getByLabelText('Type: Private equity')).backgroundColor).toBe(Colors.primaryLight);
      expect(screen.queryByLabelText('Type: Hedge funds')).toBeNull();
    });

    test('Record buy/sell → the trade sheet (Record activity), Fidelity chosen and AAPL in the ticker box', () => {
      show();
      fireEvent.press(screen.getByLabelText('Record a buy or sell for AAPL'));
      expect(screen.getByText('Record activity')).toBeOnTheScreen();
      expect(chosen(nameOf('fid'))).toBe(true);
      // the prefilled ticker survives the sheet choosing its account (it was cleared the moment the account was set)
      expect(screen.getByPlaceholderText('e.g. AAPL').props.value).toBe('AAPL');
    });

    test('Activity → the Activity sheet, this holding\'s records; a delete the ledger refuses says so', () => {
      show();
      fireEvent.press(screen.getByLabelText("See AAPL's activity"));
      expect(screen.getAllByText('Activity')).toHaveLength(2);                        // the door, and the sheet's title
    expect(screen.getByText('Every record of this holding, newest first.')).toBeOnTheScreen();
      expect(screen.getByText(/^Dividend AAPL$/)).toBeOnTheScreen();
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const del = jest.spyOn(useStore.getState() as any, 'deleteTransaction');
      (useStore.getState() as any).deleteTransaction = () => false;                  // a record from before balance-safe deletes
      fireEvent.press(screen.getByLabelText('Delete dividend AAPL'));
      expect(alert).toHaveBeenCalledWith('Can’t remove this entry', expect.stringMatching(/^It was recorded before balance-safe deletes existed/));
      alert.mockRestore(); del.mockRestore();
    });
  });

  test('Bonds opens the Bond editor and Alternatives the Alternatives editor (their drawings v02, phone 3)', () => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [] } as any);
    render(React.createElement(require('../BondsScreen').default));
    fireEvent.press(screen.getAllByLabelText('Add a bond')[0]);
    expect(screen.getAllByText('Add a bond').length).toBeGreaterThanOrEqual(1);
    render(React.createElement(require('../OtherInvestmentsScreen').default));
    fireEvent.press(screen.getAllByText('＋ Add an investment')[0]);
    expect(screen.getByText('Add an investment')).toBeOnTheScreen();
  });
});
