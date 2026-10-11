/** THE NET WORTH MODULE AGAINST ITS APPROVED DRAWINGS — what the mock-match audit of 2026-10-11 found and fixed.
 *
 *  The audit compared every word AND every figure (the word-for-word tests mask figures as "$#"), and pulled
 *  the rendered style values. Report: MoneyKeel/documents/audit/moneykeel_audit_mock-match_networth_2026-10-11.md
 *
 *  1. Net worth v08, READ THIS FIRST row 2026-10-09 (DEC-3279e, MK-NW-F-065): "A debt with no balance is named
 *     … and Net worth counts the debts that are known." One debt with no balance made the debt total NaN: the
 *     hero read "Own $813,152 − Owe No debts entered.", a refusal sentence stood where $395,152 belongs, the
 *     change line was lost and the DEBTS band had no total.
 *  2. The same row: "The bar and the percents count only known money." The debts bar drew the unknown loan as "<1%".
 *  3. Net worth v08 state E (the change walk): an indented value is grey (.wrow.ind .v), and Withdrawals −$500
 *     is drawn in the text colour — the build printed the three indented values black and the minus in red.
 *  4. Net worth v08 state C: "How do you want to add an account?" is a plain <b>, which draws at 700, not 800.
 *  5. Performance v17 frame 2 (and v14 before it), ACTIVITY: "Dividend · LCTX", "Aug 1 · from E*TRADE", "$120".
 *     The build printed "08-01" in a column of its own, "Dividend LCTX" and "+$120".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { recordedDay } from '../../testing/recordedDay';
import { isoLocalDate } from '../../domain/_shared/dates';
import { builtLines } from '../../testing/mockMatch';
import { Colors } from '../../utils/theme';

let mockParams: Record<string, string> = {};
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const today = isoLocalDate(new Date());
const daysAgo = (n: number) => isoLocalDate(new Date(Date.now() - n * 86_400_000));

/** The household Net worth v08 draws: $813,152 owned, $418,000 owed, $395,152. */
const HOUSEHOLD = (over: any = {}) => ({
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 349333,
      target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 3319,
        lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${today}T09:00:00Z`,
      maturity_date: '2027-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
  transactions: [
    { id: 'c', account_id: 'van', type: 'DEPOSIT', amount: 500, date: today },
    { id: 'w', account_id: 'van', type: 'WITHDRAWAL', amount: 500, date: today },
    { id: 'd', account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1220, date: today },
    { id: 'i', account_id: 'etr', type: 'INTEREST', amount: 430, date: today },
    { id: 'p', account_id: 'mtg', type: 'DEBT_PAYMENT', amount: 200, date: today },
  ],
  nwDaily: { [daysAgo(8)]: 393042, [today]: 395152 },
  snapshotDays: [recordedDay(daysAgo(8), [['chk', 8000, 'cash'], ['van', 838, 'cash'], ['van', 346585], ['etr', 5819, 'typed']])],
  ...over,
});
const setup = (over: any = {}) => { useStore.getState().resetAll(); mockParams = {}; useStore.setState(HOUSEHOLD(over) as any); };
const styleOf = (text: string | RegExp) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('1–2 · a debt with no balance: Net worth counts the debts that are known (v08 row 2026-10-09)', () => {
  const withUnknownLoan = () => setup({ liabilities: [...HOUSEHOLD().liabilities,
    { debt_id: 'pl', label: 'Personal loan', debt_type: 'PERSONAL', interest_rate_apr: 0.09, minimum_monthly_payment: 100 }] });

  test('the hero keeps its figures: Own $813,152 − Owe $418,000, $395,152, and the change line', () => {
    withUnknownLoan(); render(<NetWorth />);
    const lines = builtLines(screen.toJSON());
    expect(lines.slice(2, 5)).toEqual(['Own $813,152 − Owe $418,000', '$395,152',
      '▲ Change in net worth +$2,110 · Return on cash + investments +0.53% ›']);
    expect(lines.join('\n')).not.toMatch(/No debts entered|rather than showing \$0 as a fact|NaN/);
  });

  test('DEBTS carries −$418,000; the bar names the two known debts only; the loan reads "Value not entered" and is named in the amber box', () => {
    withUnknownLoan(); render(<NetWorth />);
    const lines = builtLines(screen.toJSON());
    const at = lines.indexOf('DEBTS');
    expect(lines.slice(at, at + 5)).toEqual(['DEBTS', 'ⓘ', '−$418,000', 'Home mortgage 99%', 'Chase Visa 1%']);
    expect(lines.some((l) => /^Personal loan .*%$/.test(l))).toBe(false);
    expect(lines.slice(lines.indexOf('Personal loan'), lines.indexOf('Personal loan') + 2)).toEqual(['Personal loan', 'Value not entered']);
    expect(lines).toContain('· Personal loan has no balance');
  });
});

describe('3 · the change walk, coloured as state E draws it', () => {
  test('the three indented values are grey; Withdrawals −$500 is in the text colour, never red', () => {
    setup(); render(<NetWorth />);
    fireEvent.press(screen.getByText(/Change in net worth/));
    const lines = builtLines(screen.toJSON());
    const at = lines.indexOf('How $393,042 became $395,152');
    expect(lines.slice(at, at + 19)).toEqual(['How $393,042 became $395,152',
      expect.stringMatching(/^Beginning net worth \(/), '$393,042', 'Contributions', '$500', 'Withdrawals', '−$500',
      'Wealth generated', '$1,910', 'Dividends', '$1,220', 'Interest', '$430', 'Change in investment value', '$260',
      'Debt principal you paid', '$200', expect.stringMatching(/^Ending net worth \(/), '$395,152']);
    for (const v of ['$1,220', '$430', '$260']) expect(styleOf(v).color).toBe(Colors.textSecondary);
    expect(styleOf('−$500').color).toBe(Colors.textPrimary);
  });
});

describe('4 · the first day', () => {
  test('"How do you want to add an account?" is bold at 700, in the text colour', () => {
    useStore.getState().resetAll(); useStore.getState().setOnboardingProfile(employedPartner as any);
    render(<NetWorth />);
    const q = screen.getByText('How do you want to add an account?', { exact: true });
    const st = StyleSheet.flatten(q.props.style);
    expect([st.fontWeight, st.color]).toEqual(['700', Colors.textPrimary]);
  });
});

describe('5 · the account page activity, as Performance v17 frame 2 writes a record', () => {
  test('"Dividend · LCTX", then "Aug 1 · from E*TRADE", then "$120" — no "08-01", no "+"', () => {
    useStore.getState().resetAll();
    mockParams = { id: 'e1' };
    const year = new Date().getFullYear();
    useStore.setState({ hideBalances: false,
      assetAccounts: [{ asset_id: 'e1', label: 'Account 1', institution: 'E*TRADE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 52704,
        source: 'connected', last_synced: new Date().toISOString(), cash_balance: 52704 }],
      transactions: [
        { id: 'd1', account_id: 'e1', type: 'DIVIDEND', ticker: 'LCTX', amount: 120, date: `${year}-08-01`, source: 'connected' },
        { id: 'w1', account_id: 'e1', type: 'WITHDRAWAL', amount: 300, date: `${year}-07-22` },
      ] } as any);
    const S = require('../AccountPortfolioScreen').default;
    render(<S />);
    const lines = builtLines(screen.toJSON());
    const at = lines.indexOf('Dividend · LCTX');
    expect(lines.slice(at, at + 3)).toEqual(['Dividend · LCTX', 'Aug 1 · from E*TRADE', '$120']);
    const w = lines.indexOf('Withdrawal');
    expect(lines.slice(w, w + 3)).toEqual(['Withdrawal', 'Jul 22 · you entered this', '−$300']);   // a minus stays a minus
    expect(lines).not.toContain('08-01');
  });
});
