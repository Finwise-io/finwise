/** THE ACCOUNT PAGE — his feedback of 2026-10-19 on the account-page drawing v01, held on the rendered screen.
 *
 *  1. DEC-5847 — the Bonds & CDs bar carries an info dot beside its yearly rate (e.g. 4.11%/year). The rate itself
 *     is unchanged. The dot opens the one Yearly pace entry, the same one the Performance tab's category table
 *     points to, and its words say the rate is the bonds' and CDs' own stated rates, averaged by what each is
 *     worth, not measured over the dates shown.
 *  2. DEC-5848 — the holdings note reads "the income is also on the line beneath it" (two words dropped).
 *  3. DEC-5849 — "Itemize into holdings" shows only on an account that can hold several holdings and was entered as
 *     one total (Stocks / Funds or unclassified). Never on a bond, a CD, crypto, a checking account or a home.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { GLOSSARY } from '../../domain/glossary';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

function seed(account: Record<string, unknown>) {
  useStore.getState().resetAll();
  mockParams = { id: String(account.asset_id) };
  useStore.setState({ hideBalances: false, assetAccounts: [account], transactions: [] } as any);
}

const BOND_ACCOUNT = {
  asset_id: 'b1', label: 'KeyBank CD', institution: 'KeyBank', kind: 'fixed_income', tax_bucket: 'TAXABLE',
  asset_class: 'bonds', balance: 5704, source: 'connected', last_synced: new Date().toISOString(),
  face_value: 6000, coupon_rate: 0.0411, maturity_date: '2028-08-24',
  positions: [{ position_id: 'p2', ticker: 'KEYBANK CD 4.11%', asset_class: 'bond', last_price: 1, lots: [{ lot_id: 'l2', shares: 5704, cost_per_share: 1 }] }],
};

describe('the Bonds & CDs bar carries an info dot beside its yearly rate (DEC-5847)', () => {
  test('the dot sits in the bar, before the rate, and opens the Yearly pace words', () => {
    seed(BOND_ACCOUNT);
    render(<AccountPortfolioScreen />);
    const band = screen.getByLabelText(/^Bonds & CDs, .*return 4\.11% a year$/);
    // inside the bar, in this order: the name, the market value, the dot, the rate
    const texts: string[] = [];
    const walk = (n: any) => { if (typeof n === 'string') texts.push(n); else (n?.children ?? []).forEach(walk); };
    walk(band);
    expect(texts.join('|')).toMatch(/ⓘ\|4\.11%\/year$/);
    fireEvent.press(screen.getByLabelText('What is Yearly pace?'));
    expect(screen.getByText(GLOSSARY.yearlyPace.body)).toBeOnTheScreen();
  });

  test('the Yearly pace words say plainly what the rate is', () => {
    const body = GLOSSARY.yearlyPace.body;
    expect(body).toContain('For Bonds & CDs it is the interest rate each bond and CD states for a year, averaged by what each one is worth.');
    expect(body).toContain('It is not measured over the dates shown.');
  });

  test('a bar with no stated rate carries no dot', () => {
    seed({ ...BOND_ACCOUNT, coupon_rate: undefined });
    render(<AccountPortfolioScreen />);
    expect(screen.queryByLabelText('What is Yearly pace?')).toBeNull();
  });
});

describe('the holdings note (DEC-5848)', () => {
  test('reads "the income is also on the line beneath it"; the old words are gone', () => {
    seed(BOND_ACCOUNT);
    render(<AccountPortfolioScreen />);
    // since 2026-10-19 the sentence also says a bond's or CD's interest is in its return (DEC-6212)
    // written with the drawing's own apostrophes since the page was built to the account-page drawing v01 (2026-10-19)
    expect(screen.getByText(/its dividends included, and a bond’s or CD’s interest added; the income is also on the line beneath it\./)).toBeOnTheScreen();
    expect(screen.queryByText(/the income it paid/)).toBeNull();
  });
});

describe('Itemize into holdings shows only on an account that can hold several holdings (DEC-5849)', () => {
  const base = { label: 'Account', institution: 'Bank', source: 'manual', balance: 10_000, positions: [] };
  const cases: [string, Record<string, unknown>, boolean][] = [
    ['a brokerage typed as one total', { asset_id: 'k', kind: 'brokerage', tax_bucket: 'TAXABLE' }, true],
    ['a Stocks / Funds account typed as one total', { asset_id: 's', kind: 'stocks_etf', tax_bucket: 'TAXABLE' }, true],
    ['a 401(k) typed as one total', { asset_id: 'r', kind: '401k', tax_bucket: 'PRE_TAX' }, true],
    ['a bond', { asset_id: 'b', kind: 'fixed_income', tax_bucket: 'TAXABLE' }, false],
    ['a CD', { asset_id: 'c', kind: 'cd', tax_bucket: 'TAXABLE' }, false],
    ['a crypto account', { asset_id: 'x', kind: 'crypto', tax_bucket: 'TAXABLE' }, false],
    ['a checking account', { asset_id: 'h', kind: 'checking', tax_bucket: 'CASH' }, false],
    ['a home', { asset_id: 'm', kind: 'home', tax_bucket: 'PROPERTY' }, false],
  ];
  test.each(cases)('%s → door shown: %s', (_what, acct, shown) => {
    seed({ ...base, ...acct });
    render(<AccountPortfolioScreen />);
    expect(screen.queryByText(/Itemize into holdings/) != null).toBe(shown);
  });
});

describe('the Itemize into holdings door is the amber action box, not green (DEC-5982)', () => {
  test('its box and title wear the amber tokens of DataGapsBanner', () => {
    const { Colors } = require('../../utils/theme');
    seed({ asset_id: 'k', label: 'Account', institution: 'Bank', source: 'manual', balance: 10_000, positions: [], kind: 'brokerage', tax_bucket: 'TAXABLE' });
    render(<AccountPortfolioScreen />);
    const door = screen.getByLabelText('Itemize Account into holdings');
    const box = Object.assign({}, ...[door.props.style].flat(5).filter(Boolean));
    expect([box.backgroundColor, box.borderColor, box.borderWidth]).toEqual([Colors.amberLight, Colors.amber, 1]);
    const title = screen.getByText(/Itemize into holdings/);
    const t = Object.assign({}, ...[title.props.style].flat(5).filter(Boolean));
    expect(t.color).toBe(Colors.amber);
    expect(box.backgroundColor).not.toBe(Colors.primaryLight);
  });
});

describe('the HISTORIC 12-MONTH RETURN card (DEC-6005)', () => {
  const BODY = "Add historic 12-month return on your holdings. For bonds or CDs, enter the yield to maturity if it's different from the coupon rate. The Plan tab compares it with the typical return for this type of account, and can grow your savings at it if you choose that there.";   // last clause approved 2026-10-19 ("approved.")
  test.each([
    ['a bond', { asset_id: 'b', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE' }],
    ['a CD', { asset_id: 'c', kind: 'cd', tax_bucket: 'TAXABLE' }],
    ['gold', { asset_id: 'g', kind: 'commodities', tax_bucket: 'TAXABLE' }],
  ])('on %s: the title, his body words, and "Not entered" when nothing was typed', (_what, acct) => {
    seed({ label: 'Account', institution: 'Bank', source: 'manual', balance: 10_000, positions: [], ...acct });
    render(<AccountPortfolioScreen />);
    expect(screen.getByText('HISTORIC 12-MONTH RETURN')).toBeOnTheScreen();
    expect(screen.getByText(BODY)).toBeOnTheScreen();
    expect(screen.getByText('Not entered')).toBeOnTheScreen();
    expect(screen.queryByText(/YOUR REPORTED RETURN|not set — projections/)).toBeNull();
  });
  test('the Retirement cockpit edits the same field in the same words', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'RetirementCockpit.tsx'), 'utf8');
    expect(src).toMatch(/\{HISTORIC_TTM_BODY\}/);
    expect(src).toContain('— historic 12-month return</Text>');
    expect(require('../../constants/historicReturn').HISTORIC_TTM_BODY).toBe(BODY);
  });
});

describe('the HISTORIC 12-MONTH RETURN card is not shown where the app works out the yield to maturity (DEC-6077)', () => {
  // his words, 2026-10-19: "state E - do not need historic 12-month return box as you already have YTM."
  test('a bond with face, rate, value and maturity (the drawing’s state E): no card — BOND FACTS has the yield', () => {
    seed({ asset_id: 'e', label: 'US Treasury 4.00% 2030', institution: 'Bank', source: 'manual', kind: 'fixed_income', asset_class: 'bonds',
      tax_bucket: 'TAXABLE', balance: 9850, face_value: 10000, coupon_rate: 0.04, maturity_date: '2030-09-30', positions: [] });
    render(<AccountPortfolioScreen />);
    expect(screen.getByText('Yield if held to maturity')).toBeOnTheScreen();
    expect(screen.queryByText('HISTORIC 12-MONTH RETURN')).toBeNull();
  });
  test('a CD stating its rate: no card — a bank CD’s yield to maturity is its rate', () => {
    seed({ asset_id: 'c', label: 'Ally CD', institution: 'Ally', source: 'manual', kind: 'cd', tax_bucket: 'TAXABLE',
      balance: 10000, face_value: 10000, coupon_rate: 0.045, maturity_date: '2027-06-01', positions: [] });
    render(<AccountPortfolioScreen />);
    expect(screen.queryByText('HISTORIC 12-MONTH RETURN')).toBeNull();
  });
  test('a bond with no rate entered (the drawing’s state B): the card stays', () => {
    seed({ asset_id: 'b', label: 'Muni 2029', institution: 'Bank', source: 'manual', kind: 'fixed_income', asset_class: 'bonds',
      tax_bucket: 'TAXABLE', balance: 10150, face_value: 10000, maturity_date: '2029-06-01', positions: [] });
    render(<AccountPortfolioScreen />);
    expect(screen.getByText('HISTORIC 12-MONTH RETURN')).toBeOnTheScreen();
  });
});

describe('the account page carries the Performance tab’s own window control (DEC-6079)', () => {
  // his words, 2026-10-19: "Also check in perf 17 did we have bar to select time period at the top on account page or
  // not? We should have one."
  test('five windows, in the Performance tab’s order and words, printed by the one shared component', () => {
    seed(BOND_ACCOUNT);
    render(<AccountPortfolioScreen />);
    const labels = screen.getAllByRole('button').map((b) => String(b.props.accessibilityLabel ?? '')).filter((l) => /^Show /.test(l))
      .map((l) => l.replace(/^Show /, '').split(',')[0]);
    expect(labels.slice(0, 5)).toEqual([labels[0], '1M', 'This year', '1Y', '2Y']);
    expect(labels[0]).toMatch(/^Since /);
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'AccountPortfolioScreen.tsx'), 'utf8');
    expect(src).toMatch(/<WindowSelector/);
    expect(require('fs').readFileSync(require('path').join(__dirname, '..', 'PerformanceScreen.tsx'), 'utf8')).toMatch(/<WindowSelector/);
  });
});

describe('DEC-0281 — the value line and the two BOND FACTS rows (account-page drawing rows 45-47, 2026-10-20)', () => {
  const NOTE_FACE = 'The value shown is the face value — no market value entered.';
  const NOTE_PAID = 'The value shown is what you paid — no market value entered.';
  const bond = { asset_id: 'e', label: 'US Treasury 4.00% 2030', institution: 'Bank', source: 'manual', kind: 'fixed_income', asset_class: 'bonds',
    tax_bucket: 'TAXABLE', face_value: 10000, coupon_rate: 0.04, maturity_date: '2030-09-30', positions: [] };
  test('a market value entered: no line under the summary; Price $98.50 per $100 of face and What you paid $9,700 in BOND FACTS', () => {
    seed({ ...bond, balance: 9850, amount_paid: 9700 });
    render(<AccountPortfolioScreen />);
    expect(screen.queryByText(NOTE_FACE)).toBeNull();
    expect(screen.queryByText(NOTE_PAID)).toBeNull();
    expect(screen.getByText('$98.50 per $100 of face')).toBeOnTheScreen();
    expect(screen.getByText('What you paid')).toBeOnTheScreen();
  });
  test('saved through the store with no market value: the face value is shown and said; the yields refuse, so the 12-month card shows (DEC-6077)', () => {
    useStore.getState().resetAll();
    useStore.getState().addAsset({ ...bond } as any);   // the editor's hand-over: a face value, no market value, nothing paid
    const saved = useStore.getState().assetAccounts[0];
    expect(saved).toMatchObject({ balance: 10000, value_basis: 'face' });
    mockParams = { id: String(saved.asset_id) };
    useStore.setState({ hideBalances: false, transactions: [] } as any);
    render(<AccountPortfolioScreen />);
    expect(screen.getByText(NOTE_FACE)).toBeOnTheScreen();
    expect(screen.queryByText('Price')).toBeNull();
    expect(screen.queryByText('Yield if held to maturity')).toBeNull();
    expect(screen.getByText('HISTORIC 12-MONTH RETURN')).toBeOnTheScreen();
  });
  test('saved with what was paid and no market value: what you paid is shown, and said', () => {
    useStore.getState().resetAll();
    useStore.getState().addAsset({ ...bond, amount_paid: 9700 } as any);
    const saved = useStore.getState().assetAccounts[0];
    expect(saved).toMatchObject({ balance: 9700, value_basis: 'paid' });
    mockParams = { id: String(saved.asset_id) };
    useStore.setState({ hideBalances: false, transactions: [] } as any);
    render(<AccountPortfolioScreen />);
    expect(screen.getByText(NOTE_PAID)).toBeOnTheScreen();
    expect(screen.getByText('What you paid')).toBeOnTheScreen();
  });
  test('a linked account classed Bonds & CDs: its balance is the broker\'s — never marked, no line', () => {
    seed(BOND_ACCOUNT);
    render(<AccountPortfolioScreen />);
    expect(screen.queryByText(NOTE_FACE)).toBeNull();
    expect(screen.queryByText(NOTE_PAID)).toBeNull();
  });
});

describe('Q15 — a record under a word the app does not know (account-page drawing rows 49-50, 2026-10-20)', () => {
  // the lead's example: Robinhood sent XYZ_ADJUST, $500, on Oct 5, 2026 — stored by the REAL writer, the sync
  const { ingestSync } = require('../../services/sync/ingest');
  const sync = ingestSync([], {}, [{
    account: { id: 'acc-rh', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '99887766', institution_name: 'Robinhood',
      raw_type: 'Individual', balance: { total: { amount: 25_500, currency: 'USD' } },
      sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: new Date().toISOString() } } },
    balancesCash: 500,
    positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } }, units: 100, price: 250, average_purchase_price: 200 }],
    activities: [{ id: 'x1', type: 'XYZ_ADJUST', trade_date: '2026-10-05', amount: 500 },
      { id: 'd1', type: 'DIVIDEND', trade_date: '2026-10-01', amount: 12, symbol: { id: 'u-vti', raw_symbol: 'VTI' } }],
  }], '2026-10-20T12:00:00.000Z');
  const acct = sync.accounts[0];
  const open = () => {
    useStore.getState().resetAll();
    mockParams = { id: String(acct.asset_id) };
    useStore.setState({ hideBalances: false, assetAccounts: [acct], transactions: sync.newTransactions } as any);
    render(<AccountPortfolioScreen />);
  };
  test('the row names the broker\'s word and shows the $500 it sent, in the text colour, with no plus or minus — never "Broker adjustment · $0"', () => {
    const stored = sync.newTransactions.find((t: any) => t.unclassified_word === 'XYZ_ADJUST');
    expect(stored).toMatchObject({ type: 'ADJUSTMENT', amount: 500 });   // the writer's own record
    open();
    expect(screen.getByText('XYZ_ADJUST · an activity the app does not know')).toBeOnTheScreen();
    expect(screen.getByText('Oct 5 · from Robinhood')).toBeOnTheScreen();
    expect(screen.queryByText(/^Broker adjustment/)).toBeNull();
    const row = screen.getByLabelText(/^Oct 5, 2026: XYZ_ADJUST · an activity the app does not know, \$500, which way it went is not known\. from Robinhood, read-only\.$/);
    const { within } = require('@testing-library/react-native');
    const { Colors } = require('../../utils/theme');
    const amount = within(row).getByText('$500');   // the amount it sent — no + or −
    const amt = Object.assign({}, ...[amount.props.style].flat(5).filter(Boolean));
    expect(amt.color).toBe(Colors.textPrimary);       // not the green of money known to have come in
    expect(within(row).queryByText('$0')).toBeNull();
  });
  test('the door opens this page\'s ACTIVITY, never a second copy of the page; from another screen it carries show=activity', () => {
    const { dataGaps } = require('../../domain/gaps');
    const gap = dataGaps([acct], null, Date.now(), sync.newTransactions).find((g: any) => g.kind === 'unknown-activity');
    expect(gap.fixLabel).toBe('See the activity');
    expect(gap.route).toBe(`/account-detail?id=${acct.asset_id}&show=activity`);
    // on the page itself the amber box names it, and its door lists every record here instead of opening the page again
    open();
    expect(screen.getByText(/^Robinhood sent an activity the app does not know: "XYZ_ADJUST"\./)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('See the activity'));   // the expo-router mock has no router.push: a push would throw
    expect(screen.getByText('XYZ_ADJUST · an activity the app does not know')).toBeOnTheScreen();
  });
  test('opened by that door from another screen (show=activity), the page lists every record once ACTIVITY is laid out', () => {
    // ten dividends after the unknown record push it below the first eight the list shows
    const more = Array.from({ length: 10 }, (_, i) => ({ id: `dv${i}`, date: `2026-10-${String(10 + i).padStart(2, '0')}`, type: 'DIVIDEND',
      amount: 1, ticker: 'VTI', account_id: acct.asset_id, source: 'connected' }));
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, assetAccounts: [acct], transactions: [...sync.newTransactions, ...more] } as any);
    mockParams = { id: String(acct.asset_id) };
    render(<AccountPortfolioScreen />);
    expect(screen.queryByText('XYZ_ADJUST · an activity the app does not know')).toBeNull();   // past the first eight
    screen.unmount();
    mockParams = { id: String(acct.asset_id), show: 'activity' };
    render(<AccountPortfolioScreen />);
    fireEvent(screen.getByTestId('card-activity'), 'layout', { nativeEvent: { layout: { x: 0, y: 1200, width: 360, height: 600 } } });
    expect(screen.getByText('XYZ_ADJUST · an activity the app does not know')).toBeOnTheScreen();
  });
});
