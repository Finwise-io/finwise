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
    const band = screen.getByLabelText(/^Bonds & CDs, .*return 4\.11%\/year$/);
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
    expect(screen.getByText(/its dividends included, and a bond's or CD's interest added; the income is also on the line beneath it\./)).toBeOnTheScreen();
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
