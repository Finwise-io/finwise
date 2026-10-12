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
 *
 *  RE-RUN, v02 (same day, against c40588f3 — report moneykeel_audit_mock-match_networth_2026-10-11_v02.md):
 *  6. Net worth v08 states D and F: "Meanwhile we show what you paid — it stays out of the change line." A holding
 *     with no price today moved the return: +0.80% (LCTX first recorded today at its cost) and +0.26% (LCTX priced
 *     $1,930 on the start day) where the drawing reads +0.53%.
 *  7. Q48 empty-state mock frame 1 and v08 state C: DEBTS with nothing entered shows $0. Once any account was
 *     entered the band printed no figure.
 *  8. A negative amount is written "−$100" (the minus sign), as the READ THIS FIRST row of 2026-10-10 (DEC-4036i)
 *     writes it. An overdrawn account's row read "-$100".
 *  9. Holding detail v02, READ THIS FIRST row 2026-10-11: "each line says what is missing". A purchase with no price
 *     paid read "100 sh @ No purchases recorded — the section is not drawn." and its gain "No price today — …"
 *     under a live price.
 * 10. Holding detail v02 draws "VS THE STOCK MARKET · SAME DATES". With prices that do not reach back, the holding
 *     was measured from its first close and the market over the whole window (+0.96% beside +22.40%).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { recordedDay } from '../../testing/recordedDay';
import { resetFiguresPrinted } from '../../components/figure';
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

// ─────────────────────────────── v02 re-run (2026-10-11, against c40588f3) ───────────────────────────────
const withLctxOnStart = (value: number | null) => {
  const d = recordedDay(daysAgo(8), [['chk', 8000, 'cash'], ['van', 838, 'cash'], ['van', 346585], ['etr', 5819, 'typed']]);
  if (value != null) d.holdings.push({ date: daysAgo(8), accountId: 'van', securityKey: 'LCTX', symbol: 'LCTX', units: 965, price: value / 965, value, currency: 'USD' });
  return d;
};
const lctxUnpriced = () => HOUSEHOLD().assetAccounts.map((a: any) => a.asset_id !== 'van' ? a
  : { ...a, positions: [...a.positions, { position_id: 'p2', ticker: 'LCTX', asset_class: 'stock_etf', shares: 965, price: null, lots: [{ lot_id: 'l2', shares: 965, cost_per_share: 1, purchase_date: '2024-01-02' }] }] });

describe('6 · a holding with no price today stays out of the change line (v08 states D and F)', () => {
  test.each([['not on the start day', null], ['priced $1,930 on the start day', 1930], ['at its $965 cost on the start day', 965]] as [string, number | null][])(
    'LCTX %s: the return reads +0.53%, as state D draws it', (_n, startValue) => {
      setup({ assetAccounts: lctxUnpriced(), snapshotDays: [withLctxOnStart(startValue)] });
      render(<NetWorth />);
      expect(builtLines(screen.toJSON())).toContain('▲ Change in net worth +$2,110 · Return on cash + investments +0.53% ›');
      expect(screen.getByText('· LCTX has no price today')).toBeTruthy();
    });
});

describe('7 · DEBTS with nothing entered shows $0 (Q48 frame 1; v08 state C)', () => {
  test('one cash account and no debts: DEBTS $0, then the one line and its door', () => {
    setup({ assetAccounts: [HOUSEHOLD().assetAccounts[0]], liabilities: [], transactions: [], snapshotDays: [], nwDaily: {} });
    render(<NetWorth />);
    const lines = builtLines(screen.toJSON());
    const at = lines.indexOf('DEBTS');
    expect(lines.slice(at, at + 4)).toEqual(['DEBTS', 'ⓘ', '$0', 'Nothing entered yet. Add your debts ›']);
  });
});

describe('8 · a negative amount is written with the minus sign', () => {
  test('an overdrawn account built by hand reads "−$100" under Cash, never "-$100" (READ THIS FIRST 2026-10-10, DEC-4036i)', () => {
    setup({ assetAccounts: [...HOUSEHOLD().assetAccounts,
      { asset_id: 'od', label: 'Ally Brokerage', institution: 'Ally', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: -100, cash_balance: 50, source: 'manual' }] });
    render(<NetWorth />);
    const lines = builtLines(screen.toJSON());
    const at = lines.indexOf('Ally Brokerage');
    expect(lines.slice(at, at + 4)).toEqual(['Ally Brokerage', 'cash in this account', '✍️ By hand · you update it', '−$100']);
    expect(lines.join('\n')).not.toMatch(/(^|[^\w])-\$/m);
  });
});

describe('9–10 · Holding detail: a purchase with no price paid, and prices that do not reach back', () => {
  const iso = (d: Date) => isoLocalDate(d);
  const day = (n: number) => iso(new Date(Date.now() - n * 86400e3));
  const show = () => {
    useStore.getState().resetAll(); resetFiguresPrinted();
    mockParams = { account: 'fid', position: 'p1' };
    useStore.setState({ onboardingComplete: true, hideBalances: false, pricesFetchedAt: new Date().toISOString(),
      assetAccounts: [{ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
        positions: [{ position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, purchase_date: '2023-03-14' }] }] }],
      priceCache: { AAPL: { ticker: 'AAPL', points: [{ date: day(1), close: 239.53 }, { date: day(0), close: 241.84 }] },
        SPY: { ticker: 'SPY', points: [{ date: day(400), close: 400 }, { date: day(366), close: 500 }, { date: day(1), close: 610 }, { date: day(0), close: 612 }] } },
    } as any);
    const H = require('../HoldingDetailScreen').default;
    render(<H />);
    return builtLines(screen.toJSON());
  };
  test('9 · the purchase reads "100 sh @ no purchase price recorded"; the gain says why it is not stated', () => {
    const lines = show();
    expect(lines).toContain('100 sh @ no purchase price recorded');
    const g = lines.indexOf('Gain — long-term (held over 1 yr)');
    expect(lines[g + 1]).toBe('Not stated — a purchase has no price paid or share count on record.');
    expect(lines.join('\n')).not.toMatch(/section is not drawn|No price today/);
  });
  test('10 · two days of prices: the holding +0.96% ($239.53 → $241.84) beside the market over the same two days, +0.33% ($610 → $612)', () => {
    const lines = show();
    const y = lines.indexOf('Your return, past year');
    expect(lines.slice(y, y + 6)).toEqual(['Your return, past year', '+0.96%', 'The market, same dates', '+0.33%', 'You are', 'ahead by 0.6 points']);
  });
});
